"""Build the embedded game guide from README, using its simple Markdown format."""
import argparse
import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
START = '<!-- GAME GUIDE START -->'
END = '<!-- GAME GUIDE END -->'


def guide_html():
    blocks = []
    for block in (ROOT / 'README.md').read_text().strip().split('\n\n'):
        if block.startswith('# '):
            blocks.append('<h1>' + html.escape(block[2:]) + '</h1>')
        elif block.startswith('## '):
            blocks.append('<h2>' + html.escape(block[3:]) + '</h2>')
        elif re.match(r'^\d+\. ', block):
            items = [re.sub(r'^\d+\. ', '', line) for line in block.splitlines()]
            blocks.append('<ol>' + ''.join('<li>' + html.escape(item) + '</li>' for item in items) + '</ol>')
        else:
            blocks.append('<p>' + html.escape(' '.join(block.splitlines())) + '</p>')
    return START + '\n' + '\n'.join('        ' + block for block in blocks) + '\n        ' + END


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Fail if the guide is out of sync.')
    args = parser.parse_args()
    index = ROOT / 'index.html'
    original = index.read_text()
    pattern = re.escape(START) + r'.*?' + re.escape(END)
    if len(re.findall(pattern, original, flags=re.S)) != 1:
        raise SystemExit('Expected one GAME GUIDE block in index.html')
    updated = re.sub(pattern, lambda _: guide_html(), original, flags=re.S)
    if args.check:
        if updated != original:
            raise SystemExit('Guide differs from README. Run python3 scripts/sync-help.py')
    else:
        index.write_text(updated)


if __name__ == '__main__':
    main()
