#!/usr/bin/env python3
"""Build per-surah Pickthall translations from the pinned quran-json snapshot.

Download data/extra/english_pickthall.json at the revision in the credits and
run: python3 tools/build-quran-english.py /path/to/english_pickthall.json
"""
import hashlib, json, re, sys
from pathlib import Path
root = Path(__file__).resolve().parent.parent
revision = '6523a9ad3b73bb7e8cb3a9cdf0ea774b8bab3123'
source_hash = 'f93ecb2a50578c9cc4e5b89630e79fa9bcdd1d289b1a858f2aedf5aa55e8194a'
if len(sys.argv) != 2:
    raise SystemExit(__doc__)
raw = Path(sys.argv[1]).read_bytes()
if hashlib.sha256(raw).hexdigest() != source_hash:
    raise SystemExit('Unexpected source snapshot checksum')
data = json.loads(raw)
qscript = (root / 'scripture-quran-data.js').read_text(encoding='utf-8')
# QURAN is an object literal stored as JSON by the original reader builder.
match = re.search(r'window\.QURAN\s*=\s*(\{.*\})\s*;', qscript, re.S)
if not match: raise SystemExit('Unexpected Quran data format')
counts = json.loads(match.group(1))['counts']
if len(data) != 114 or len(counts) != 114: raise SystemExit('Expected 114 surahs')
for s in range(1,115):
    rows = data[str(s)]
    if len(rows) != counts[s-1] or any(r['chapter'] != s or r['verse'] != i or not isinstance(r['text'],str) or not r['text'] for i,r in enumerate(rows,1)):
        raise SystemExit('Invalid verse alignment in surah ' + str(s))
    texts = [r['text'] for r in rows]
    out = '/* Pickthall 1930; quran-json snapshot, see scripture-credits.md. */\nwindow.EN_SURAHS = window.EN_SURAHS || {};\nwindow.EN_SURAHS[' + str(s) + '] = ' + json.dumps(texts,ensure_ascii=False,separators=(',',':')) + ';\n'
    (root / f'scripture-en-{s}.js').write_text(out, encoding='utf-8')
print('Built 114 surahs,',sum(counts),'unmodified English translations, revision', revision)
