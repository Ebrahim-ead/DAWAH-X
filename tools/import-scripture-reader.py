#!/usr/bin/env python3
"""Import the owner's QURAN reader from a checked-out source directory.

Usage: python3 tools/import-scripture-reader.py /path/to/QURAN
The browser payloads are copied verbatim except that hadith JS assignments
are stored as deterministic gzip-compressed JSON arrays; no text is edited.
The reader application and page shells are maintained separately here.
"""
import gzip
import hashlib
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]).resolve() if len(sys.argv) == 2 else None
if not SRC or not (SRC / 'assets/hadith-index.js').is_file():
    raise SystemExit('Pass the extracted dawah-x/QURAN source directory')

def copy(src, dest):
    shutil.copyfile(SRC / src, ROOT / dest)

def sha(data):
    return hashlib.sha256(data).hexdigest()

# These files are loaded lazily by the reader. Names are flat and lowercase
# for the site's existing GitHub Pages deployment/upload conventions.
for group in ('bn', 'tafsir', 'tafsir-ibn-kathir'):
    files = sorted((SRC / 'assets' / group).glob('*.js'), key=lambda f: int(f.stem))
    if [int(f.stem) for f in files] != list(range(1, 115)):
        raise SystemExit('Invalid 114-surah shard set: ' + group)
    for f in files:
        shutil.copyfile(f, ROOT / ('scripture-' + group + '-' + f.name))

for filename in ('surahs.js', 'quran-data.js', 'quran-meta.js', 'bn-index.js',
                 'bn-translation.js', 'hadith-index.js', 'tafsir-ibn-kathir-index.js'):
    copy('assets/' + filename, 'scripture-' + filename)
for source, target in [('assets/Hafs_20.woff2', 'scripture-hafs.woff2'),
                       ('assets/NotoSansBengali.woff2', 'scripture-bengali.woff2')]:
    copy(source, target)

for f in (SRC / 'LICENSES').glob('*.txt'):
    copy('LICENSES/' + f.name, 'scripture-license-' + f.name.lower())
credits = (SRC / 'CREDITS.md').read_text(encoding='utf-8')
credits = re.sub(r'LICENSES/([A-Za-z0-9.-]+\.txt)', lambda m: 'scripture-license-' + m.group(1).lower(), credits)
prefix = '''# DAWAH X পাঠকের উৎস-নোট

নিচের নথিটি মূল [QURAN রিপোজিটরির](https://github.com/dawah-x/QURAN/tree/21f4214fb5fce8feb515e61777682a5981f6a763) উৎস ও শর্তের নথি। সেখানে উল্লেখিত `assets/`, `data/` ও নির্মাণ-টুলের পথগুলো মূল রিপোজিটরির; এই সাইটে পাঠকের ফাইলগুলো `scripture-` নামে root-এ রাখা হয়েছে। হাদিসের মূল অ্যারে পাঠ পরিবর্তন না করে gzip JSON-এ সংরক্ষিত; ফাইল ও checksum `scripture-manifest.json`-এ আছে। কিছু হাদিসে উৎসেই আরবি বা অনুবাদ অনুপস্থিত। মূল প্রকাশকদের শর্ত, attribution ও লাইসেন্স বহাল।

gzip পড়তে ব্যবহৃত fflate 0.8.2-এর MIT লাইসেন্স: [scripture-license-fflate.txt](scripture-license-fflate.txt)।

---

'''
(ROOT / 'scripture-credits.md').write_text(prefix + credits, encoding='utf-8')

books = ('bukhari', 'muslim', 'abudawud', 'tirmidhi', 'nasai', 'ibnmajah', 'mishkat', 'malik', 'nawawi')
shards, totals = [], {}
for book in books:
    total = 0
    files = sorted((SRC / 'assets/hadith' / book).glob('*.js'), key=lambda f: int(f.stem))
    for f in files:
        sec = int(f.stem)
        raw = f.read_bytes()
        text = raw.decode('utf-8')
        prefix = "window.HADITH_DATA['" + book + "'][" + str(sec) + "]="
        if text.count(prefix) != 1:
            raise SystemExit('Unexpected assignment: ' + str(f))
        payload = text.split(prefix, 1)[1].strip()
        if not payload.endswith(';'):
            raise SystemExit('Missing final semicolon: ' + str(f))
        payload = payload[:-1].encode('utf-8')
        rows = json.loads(payload)
        if not isinstance(rows, list) or any(not isinstance(row, list) or len(row) != 8 for row in rows):
            raise SystemExit('Invalid hadith data: ' + str(f))
        filename = f'scripture-hadith-{book}-{sec}.json.gz'
        with open(ROOT / filename, 'wb') as stream:
            with gzip.GzipFile(filename='', mode='wb', fileobj=stream, mtime=0, compresslevel=9) as z:
                z.write(payload)
        shards.append({'book': book, 'section': sec, 'count': len(rows), 'sha256': sha(payload), 'file': filename})
        total += len(rows)
    totals[book] = total
if len(shards) != 428 or sum(totals.values()) != 42469:
    raise SystemExit('Unexpected hadith totals: ' + repr(totals))
manifest = {'source': 'https://github.com/dawah-x/QURAN',
            'revision': '21f4214fb5fce8feb515e61777682a5981f6a763',
            'total': sum(totals.values()), 'books': totals, 'shards': shards}
(ROOT / 'scripture-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
print('Imported 114 surahs,', len(shards), 'hadith shards and', sum(totals.values()), 'hadiths:', totals)
