#!/usr/bin/env python3
"""Inspect a locally exported DBHT WordPress post JSONL stream without publishing it.

Each line must contain id, title and content. The input may contain unrelated or
private tabs; only aggregate counts and numbering anomalies are emitted. The
script does not certify provenance, copyright, authenticity or completeness.
"""
import argparse
import collections
import json
import re
import sys
from html.parser import HTMLParser

DIGITS = str.maketrans('০১২৩৪৫৬৭৮৯', '0123456789')
TAB_RE = re.compile(r'\[tab\s+title=["\']([^"\']+)["\'][^\]]*\](.*?)\[/tab\]', re.S | re.I)
BN_RE = re.compile(r'[\u0980-\u09ff]')
AR_RE = re.compile(r'[\u0600-\u06ff]')

class Text(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.ignored = 0
    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.ignored += 1
        elif not self.ignored and tag in ('p', 'div', 'br', 'li', 'h1', 'h2', 'h3'):
            self.parts.append('\n')
    def handle_endtag(self, tag):
        if tag in ('script', 'style') and self.ignored:
            self.ignored -= 1
        elif not self.ignored and tag in ('p', 'div', 'li', 'h1', 'h2', 'h3'):
            self.parts.append('\n')
    def handle_data(self, data):
        if not self.ignored:
            self.parts.append(data)
    def text(self):
        return '\n'.join(' '.join(x.split()) for x in ''.join(self.parts).splitlines() if x.strip())

def strip_html(s):
    p = Text()
    p.feed(s)
    return p.text()

def inspect(post):
    title, content = post['title'], post['content']
    tabs = {}
    for name, body in TAB_RE.findall(content):
        tabs.setdefault(name, []).append(strip_html(body))
    bn = '\n'.join(tabs.get('বাংলা', []))
    ar = '\n'.join(tabs.get('العربية', []))
    if 'যয়িফ ও জাল হাদিস' in title:
        group = 'daif'
    elif 'সম্ভার' in title or (re.fullmatch(r'হাদীস\s+[০-৯0-9]+', title.strip()) and 'হাদীস সম্ভার' in bn[:2000]):
        group = 'sombhar'
    else:
        return None
    matches = re.findall(r'[0-9]+', title.translate(DIGITS))
    title_num = int(matches[-1]) if matches else None
    normalized = bn[:3000].translate(DIGITS)
    if group == 'sombhar':
        m = re.search(r'কিতাব\s*[:ঃ-]*\s*হাদীস সম্ভার\s*::.*?হাদীস\s*(?:নং\s*[:ঃ-]*)?\s*([0-9]+)', normalized, re.S)
    else:
        m = re.search(r'হাদীস\s*নং\s*[:ঃ-]*\s*([0-9]+)', normalized)
    return {'id': post['id'], 'group': group, 'title_number': title_num,
            'body_number': int(m.group(1)) if m else None,
            'bangla_tab_count': len(tabs.get('বাংলা', [])),
            'arabic_tab_count': len(tabs.get('العربية', [])),
            'has_bangla': bool(BN_RE.search(bn)), 'has_arabic': bool(AR_RE.search(ar))}

def summarize(rows, expected):
    result = {}
    for group, maximum in expected.items():
        entries = [r for r in rows if r['group'] == group]
        counts = collections.Counter(r['title_number'] for r in entries if r['title_number'] is not None)
        bodies = collections.Counter(r['body_number'] for r in entries if r['body_number'] is not None)
        result[group] = {'candidates': len(entries), 'title_unique': len(counts),
            'title_missing': [n for n in range(1, maximum + 1) if not counts[n]],
            'title_duplicates': {str(k): v for k, v in sorted(counts.items()) if v > 1},
            'body_missing': [n for n in range(1, maximum + 1) if not bodies[n]],
            'body_duplicates': {str(k): v for k, v in sorted(bodies.items()) if v > 1},
            'body_number_unrecognized': sum(r['body_number'] is None for r in entries),
            'title_body_mismatch': [r for r in entries if r['body_number'] is not None and r['title_number'] != r['body_number']],
            'missing_bangla_text': sum(not r['has_bangla'] for r in entries),
            'missing_arabic_text': sum(not r['has_arabic'] for r in entries),
            'unexpected_tab_counts': sum(r['bangla_tab_count'] != 1 or r['arabic_tab_count'] != 1 for r in entries),
            'title_outside_range': [r for r in entries if r['title_number'] is None or not 1 <= r['title_number'] <= maximum]}
    return result

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', help='JSONL export of DBHT posts; use - for stdin')
    args = parser.parse_args()
    f = sys.stdin if args.input == '-' else open(args.input, encoding='utf-8')
    rows = []
    try:
        for line in f:
            if line.strip():
                row = inspect(json.loads(line))
                if row:
                    rows.append(row)
    finally:
        if f is not sys.stdin:
            f.close()
    json.dump(summarize(rows, {'sombhar': 3902, 'daif': 2000}), sys.stdout, ensure_ascii=False, indent=2)
    print()

if __name__ == '__main__':
    main()
