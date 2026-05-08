#!/usr/bin/env python3
"""从 HTML 内容中提取纯文本"""
import sys
from html.parser import HTMLParser

class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text = []
        self.skip_tags = {'script', 'style', 'nav', 'footer', 'header', 'aside', 'noscript'}
        self.current_tag = None

    def handle_starttag(self, tag, attrs):
        self.current_tag = tag
        if tag in self.skip_tags:
            return
        if tag == 'p':
            self.text.append('\n')

    def handle_data(self, data):
        if self.current_tag not in self.skip_tags:
            text = data.strip()
            if text:
                self.text.append(text)

    def get_text(self) -> str:
        return '\n'.join(self.text)

def extract_text(html_content: str) -> str:
    """提取 HTML 中的纯文本"""
    extractor = TextExtractor()
    extractor.feed(html_content)
    return extractor.get_text()

if __name__ == "__main__":
    html = sys.stdin.read()
    print(extract_text(html))
