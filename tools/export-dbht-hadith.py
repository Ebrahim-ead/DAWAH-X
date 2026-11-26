#!/usr/bin/env python3
"""Select DBHT hadith Bengali/Arabic tabs, excluding all other WordPress data.

Reads a local JSONL export of published posts. Does not execute source code or
SQL. Preserve textual tabs as presented, including source numbering conflicts;
no attempt is made to establish copyright, identity or authenticity.
"""
import gzip
import hashlib
import importlib.util
import json
import re
import sys
from pathlib import Path

spec = importlib.util.spec_from_file_location('inspector', Path(__file__).with_name('inspect-dbht-hadith.py'))
inspector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(inspector)


def select(post):
    info = inspector.inspect(post)
    if not info or info['title_number'] is None:
        return None
    tabs = {}
    for name, html in inspector.TAB_RE.findall(post['content']):
        if name in ('বাংলা', 'العربية'):
            tabs.setdefault(name, []).append(inspector.strip_html(html))
    if any(len(tabs.get(name, [])) != 1 for name in ('বাংলা', 'العربية')):
        raise ValueError(f"Unexpected tab structure in post {post['id']}")
    bn, ar = tabs['বাংলা'][0], tabs['العربية'][0]
    # Contact information belongs to the separate feedback tab; fail closed if
    # an unexpected structure leaks it into a selected tab.
    if re.search(r'[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}', bn + '\n' + ar):
        raise ValueError(f"Unexpected email in content tab {post['id']}")
    return {'id': post['id'], 'group': info['group'], 'title': post['title'],
            'title_number': info['title_number'], 'body_number': info['body_number'],
            'bn': bn, 'ar': ar}


def main():
    if len(sys.argv) != 3:
        raise SystemExit('Usage: export-dbht-hadith.py input.jsonl output.json.gz')
    selected = []
    with open(sys.argv[1], encoding='utf-8') as f:
        for line in f:
            if line.strip():
                row = select(json.loads(line))
                if row:
                    selected.append(row)
    ids = [r['id'] for r in selected]
    if len(ids) != len(set(ids)) or ids != sorted(ids):
        raise ValueError('Duplicate or unordered post IDs')
    counts = {group: sum(r['group'] == group for r in selected) for group in ('sombhar', 'daif')}
    if counts != {'sombhar': 3899, 'daif': 1998}:
        raise ValueError('Unexpected source inventory: ' + repr(counts))
    data = json.dumps({'source': 'DBHT Hadith Software 7, WordPress post language tabs',
                       'posts': selected}, ensure_ascii=False, separators=(',', ':')).encode()
    output = gzip.compress(data, compresslevel=9, mtime=0)
    Path(sys.argv[2]).write_bytes(output)
    print(counts, 'bytes', len(output), 'sha256', hashlib.sha256(output).hexdigest())

if __name__ == '__main__':
    main()
