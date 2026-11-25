#!/usr/bin/env python3
"""Build Saheeh International (QuranEnc english_saheeh v1.1.2) per-surah files.

Download data/quranenc/english_saheeh.json from the pinned quran-json revision
and run: python3 tools/build-quran-english.py /path/to/english_saheeh.json
Translation and footnotes are preserved verbatim; attribution is in the reader.
"""
import hashlib, json, re, sys
from pathlib import Path
root = Path(__file__).resolve().parent.parent
revision = '6523a9ad3b73bb7e8cb3a9cdf0ea774b8bab3123'
source_hash = 'c12b5bed64837cb744e075fdd3b79f885aee1522d92468f36c38ff565bfdc439'
if len(sys.argv) != 2:
    raise SystemExit(__doc__)
raw = Path(sys.argv[1]).read_bytes()
if hashlib.sha256(raw).hexdigest() != source_hash:
    raise SystemExit('Unexpected source snapshot checksum')
data = json.loads(raw)
qscript = (root / 'scripture-quran-data.js').read_text(encoding='utf-8')
match = re.search(r'window\.QURAN\s*=\s*(\{.*\})\s*;', qscript, re.S)
if not match: raise SystemExit('Unexpected Quran data format')
counts = json.loads(match.group(1))['counts']
if len(data) != 114 or len(counts) != 114: raise SystemExit('Expected 114 surahs')
all_texts,all_notes = [],[]
compact=lambda data: json.dumps(data,ensure_ascii=False,separators=(',',':'))
for s in range(1,115):
    rows = data[str(s)]
    if len(rows) != counts[s-1] or any(r['chapter'] != s or r['verse'] != i or not isinstance(r.get('text'),str) or not r['text'] or not isinstance(r.get('footnotes',''),str) for i,r in enumerate(rows,1)):
        raise SystemExit('Invalid verse alignment in surah ' + str(s))
    texts = [r['text'] for r in rows]
    notes = [r.get('footnotes','') for r in rows]
    all_texts.append(texts);all_notes.append(notes)
    out = '/* Saheeh International, Noor International Center, QuranEnc english_saheeh v1.1.2; see scripture-credits.md. */\nwindow.EN_SURAHS = window.EN_SURAHS || {};\nwindow.EN_NOTES = window.EN_NOTES || {};\nwindow.EN_SURAHS[' + str(s) + '] = ' + compact(texts) + ';\nwindow.EN_NOTES[' + str(s) + '] = ' + compact(notes) + ';\n'
    (root / f'scripture-en-{s}.js').write_text(out, encoding='utf-8')
bundle = '/* Saheeh International, QuranEnc english_saheeh v1.1.2; English search index. */\nwindow.EN_TRANSLATION = ' + compact(all_texts) + ';\n'
(root / 'scripture-en-translation.js').write_text(bundle, encoding='utf-8')
print('Built 114 surahs and search bundle,',sum(counts),'unmodified English translations and footnotes, revision', revision)
