# -*- coding: utf-8 -*-
"""fonts/ ফোল্ডারের woff2 ফাইলগুলো সাইটে ব্যবহৃত অক্ষরে ছোট করা হয় (subset)।

কেন: বাংলা ফন্টের তিনটি ওজন মিলিয়ে ~২২২ KB + ল্যাটিন ~২৮ KB প্রথম লোডে নামে,
যেখানে সাইটে মাত্র ৮০টি বাংলা অক্ষর ব্যবহৃত। subset করার পর মোট ~১১৪ KB।

ব্যবহার:
    python3 -m pip install fonttools brotli
    python3 tools/subset-fonts.py          # নীরবে কাজ করে, শেষে আকার দেখায়
    python3 tools/subset-fonts.py --dry    # কিছু লেখে না, শুধু হিসাব দেখায়

নিয়ম:
- অক্ষর-তালিকা = সাইটের প্রকৃত লেখা (html, root js/json, texts/*.json, xml)
  + ASCII + পুরো বাংলা ব্লক (U+0980–09FF) + বিরামচিহ্ন/স্পেস কন্ট্রোল।
  পুরো বাংলা ব্লক রাখা হয় যাতে পরে নতুন লেখা যোগ হলে গ্লিফ না-থাকার ঝুঁকি না থাকে
  (পরিমাপে দেখা গেছে এতে আকার বাড়ে না)।
- --layout-features='*' রাখা বাধ্যতামূলক, নইলে যুক্তাক্ষর (ক্ষ, ন্ত, ঞ্জ ...) ভাঙে।
- বাংলা/ল্যাটিন ফন্টের @font-face-এ unicode-range থাকায় বাদ পড়া অক্ষর
  সিস্টেম ফন্টে পড়বে, তাই নতুন অক্ষর এলেও লেখা ভাঙবে না।
"""
import glob
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_DIR = os.path.join(ROOT, 'fonts')

# আরবি নাসখ ফন্ট ছোট করা হয় না: কুরআন/হাদিসের উদ্ধৃতি texts/ থেকে আসে,
# সেখানে বিরল হরকত/লিগেচার বাদ পড়লে চোখে পড়ে; আর এটি lazy লোড হয়, তাই LCP-তে প্রভাব নেই।
EXCLUDE = ('noto-naskh',)

# যে ফাইলগুলোর লেখা সাইটে দেখা যায় (texts/ বাদ দেওয়া হয় না — read.html সেগুলো আনে)
CONTENT_GLOBS = ['*.html', '*.js', '*.json', '*.xml']
CONTENT_DIRS = ['texts']

EXTRA = (
    ''.join(chr(c) for c in range(0x20, 0x7F))          # ASCII
    + ''.join(chr(c) for c in range(0x0980, 0x0A00))    # পুরো বাংলা ব্লক
    + '\u0964\u0965\u200b\u200c\u200d\u200e\u200f\u00a0\u00b7'
    + '\u00ab\u00bb\u2018\u2019\u201c\u201d\u2013\u2014\u2026'
    + '\u2190\u2192\u25a0\u25aa\u00d7\u00b0\u00a9\u00a7\u20b9\u09f3'
)


def charset() -> str:
    chars = set(EXTRA)
    files = []
    for pat in CONTENT_GLOBS:
        files += glob.glob(os.path.join(ROOT, pat))
    for d in CONTENT_DIRS:
        files += glob.glob(os.path.join(ROOT, d, '*.json'))
    for f in files:
        try:
            with open(f, encoding='utf-8', errors='ignore') as fh:
                chars |= set(fh.read())
        except OSError:
            pass
    return ''.join(sorted(chars))


def main() -> int:
    dry = '--dry' in sys.argv
    chars = charset()
    tmp = os.path.join('/tmp', 'dawahx-charset.txt')
    with open(tmp, 'w', encoding='utf-8') as fh:
        fh.write(chars)
    print('অক্ষর: %d (বাংলা %d)' % (len(chars), sum('\u0980' <= c <= '\u09ff' for c in chars)))

    total_before = total_after = 0
    for path in sorted(glob.glob(os.path.join(FONT_DIR, '*.woff2'))):
        name = os.path.basename(path)
        if any(x in name for x in EXCLUDE):
            print('%-45s %7.1f KB — বাদ (নীতি মেনে অপরিবর্তিত)' % (name, os.path.getsize(path) / 1024))
            continue
        before = os.path.getsize(path)
        out = os.path.join('/tmp', 'subset-' + name)
        cmd = [
            sys.executable, '-m', 'fontTools.subset', path,
            '--text-file=' + tmp,
            '--flavor=woff2',
            '--layout-features=*',
            '--no-hinting',
            '--desubroutinize',
            '--output-file=' + out,
        ]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode != 0:
            print('ব্যর্থ:', name, r.stderr.strip().splitlines()[-1:])
            return 1
        after = os.path.getsize(out)
        total_before += before
        total_after += after
        print('%-45s %7.1f KB → %6.1f KB' % (name, before / 1024, after / 1024))
        if not dry and after < before:
            os.replace(out, path)
    print('মোট: %.1f KB → %.1f KB (−%.0f%%)%s' % (
        total_before / 1024, total_after / 1024,
        100 - total_after * 100 / total_before,
        '  [dry run — কিছুই বদলানো হয়নি]' if dry else ''))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
