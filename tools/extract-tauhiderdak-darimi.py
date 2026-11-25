#!/usr/bin/env python3
"""Extract the 2024 Darimi mirror without treating it as the current edition.

Input is the pinned WordPress category response. All source paragraphs are
retained in the full-text note, even where the display extracts duplicate them.
No source number is silently corrected; three numbers are duplicated.
"""
import collections, gzip, hashlib, html, json, re, sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'tools/tauhiderdak-darimi-posts.json.gz'
SHA256 = 'ab405f36581154043e7982bd028a2035f16c7819adcc10b443ec789ecc9bee2f'
BN = str.maketrans('০১২৩৪৫৬৭৮৯', '0123456789')

class Blocks(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.blocks, self.block, self.depth, self.ignore = [], None, 0, 0
    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.ignore += 1
            return
        if self.ignore:
            return
        if self.block is None and tag in ('p', 'h1', 'h2', 'h3', 'li'):
            self.block, self.depth, self.text = tag, 1, []
        elif self.block:
            if tag == 'br':
                self.text.append('\n')
            elif tag not in ('img', 'input', 'hr'):
                self.depth += 1
    def handle_endtag(self, tag):
        if tag in ('script', 'style') and self.ignore:
            self.ignore -= 1
            return
        if self.ignore or not self.block:
            return
        if tag not in ('br', 'img', 'input', 'hr'):
            self.depth -= 1
            if self.depth == 0:
                self.blocks.append((self.block, ''.join(self.text).strip()))
                self.block = None
    def handle_data(self, data):
        if self.block and not self.ignore:
            self.text.append(data)

def number(s):
    return int(s.translate(BN))

def main():
    compressed = SOURCE.read_bytes()
    if hashlib.sha256(compressed).hexdigest() != SHA256:
        raise ValueError('Source snapshot checksum changed')
    posts = json.loads(gzip.decompress(compressed))
    if len(posts) != 60:
        raise ValueError('Unexpected source post count')
    sections = []
    for post in posts:
        title = html.unescape(post['title']['rendered'])
        m = re.search(r'হাদিস নং\s*([০-৯]+)\s*[–-]\s*([০-৯]+)', title)
        if not m:
            continue
        first, last = map(number, m.groups())
        parser = Blocks()
        parser.feed(post['content']['rendered'])
        blocks = parser.blocks
        starts = [i for i, (tag, text) in enumerate(blocks[:-1])
                  if tag == 'p' and re.fullmatch('[০-৯]+', text)
                  and 'শেয়ার ও অন্যান্য' in blocks[i + 1][1]]
        if len(starts) != last - first + 1:
            raise ValueError(f'{title}: inconsistent record count')
        entries = []
        for offset, ix in enumerate(starts):
            end = starts[offset + 1] if offset + 1 < len(starts) else len(blocks)
            record = blocks[ix:end]
            grades = [i for i, (_, text) in enumerate(record) if 'হাদিসের মানঃ' in text]
            if len(grades) != 1:
                raise ValueError(f'{title}: ambiguous grade in record {offset}')
            gi = grades[0]
            if offset + 1 < len(starts) and any(text for _, text in record[gi + 1:]):
                raise ValueError(f'{title}: unexpected content after grade')
            content = [text for _, text in record[3:gi] if text]
            if not content or not content[0].startswith('পরিচ্ছেদঃ'):
                raise ValueError(f'{title}: missing subsection')
            grade_info = record[gi][1]
            match = re.search(r'হাদিসের মানঃ\s*(.*?)(?:\s*বর্ণনাকারীঃ|\s*পুনঃনিরীক্ষণঃ|$)', grade_info)
            narrator = re.search(r'বর্ণনাকারীঃ\s*(.*?)(?:\s*পুনঃনিরীক্ষণঃ|$)', grade_info)
            if not match or not match.group(1).strip():
                raise ValueError(f'{title}: missing grade')
            bangla = next((v for v in content[1:] if re.search(r'[\u0980-\u09ff]', v)), '')
            arabic = [v for v in content[1:] if re.search(r'[\u0600-\u06ff]', v) and not re.search(r'[\u0980-\u09ff]', v)]
            if not bangla or not arabic:
                raise ValueError(f'{title}: missing display text')
            entries.append({'number': number(record[0][1]), 'bn': bangla,
                'ar': '\n\n'.join(arabic), 'grade': match.group(1).strip(),
                'narrator': narrator.group(1).strip() if narrator else '',
                'section': content[0], 'full': '\n\n'.join(content[1:])})
        sections.append({'title': title, 'url': post['link'], 'first': first, 'last': last, 'entries': entries})
    sections.sort(key=lambda s: s['first'])
    if len(sections) != 59 or sum(len(s['entries']) for s in sections) != 3542:
        raise ValueError('Unexpected mirror coverage')
    if sections[0]['first'] != 1 or sections[-1]['last'] != 3542 or any(a['last']+1 != b['first'] for a,b in zip(sections,sections[1:])):
        raise ValueError('Unexpected source page ranges')
    counts = collections.Counter(v['number'] for s in sections for v in s['entries'])
    if {n for n,c in counts.items() if c > 1} != {113,914,3312} or set(range(1,3543)) - set(counts) != {114,915,3313}:
        raise ValueError('Source number anomalies changed')
    json.dump({'sections':sections}, sys.stdout, ensure_ascii=False, separators=(',',':'))

if __name__ == '__main__':
    main()
