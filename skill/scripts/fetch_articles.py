#!/usr/bin/env python3
"""
WeWe RSS 文章获取工具（Docker MySQL 部署）
用法:
    python fetch_articles.py <公众号名称|文章链接>
    python fetch_articles.py <公众号名称|文章链接> --limit N
    python fetch_articles.py <公众号名称|文章链接> --text  # 输出纯文本
"""
import sys
import os
import re

script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, script_dir)

from query_mp_id import query_mp_id_by_name, query_mp_id_by_biz
from get_articles import get_articles
from extract_text import extract_text

def extract_biz_from_url(url: str) -> str | None:
    """从文章链接提取 __biz 参数"""
    match = re.search(r'__biz=([^&]+)', url)
    return match.group(1) if match else None

def fetch_articles(query: str, limit: int = 10, text_only: bool = False, update: bool = False):
    """获取并显示文章"""
    if '__biz=' in query:
        biz_str = extract_biz_from_url(query)
        if biz_str:
            mp_id = query_mp_id_by_biz(biz_str)
        else:
            print(f"无法从链接提取 __biz: {query}", file=sys.stderr)
            return
    else:
        mp_id = query_mp_id_by_name(query)

    if not mp_id:
        return

    articles = get_articles(mp_id, limit, update)
    if not articles:
        print("未获取到文章")
        return

    for i, article in enumerate(articles, 1):
        print(f"\n{'='*60}")
        title = article.get('title', '无标题').encode('gbk', errors='replace').decode('gbk')
        print(f"[{i}] {title}")
        url = article.get('url', '无链接')
        print(f"链接: {url}")
        date = article.get('date_modified', '无日期')
        print(f"日期: {date}")

        if text_only and article.get('content'):
            print(f"\n正文预览:")
            text = extract_text(article['content'])
            print(text[:500] + "..." if len(text) > 500 else text)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="获取微信公众号文章 (Docker MySQL)")
    parser.add_argument("query", help="公众号名称或文章链接")
    parser.add_argument("--limit", "-n", type=int, default=10, help="文章数量")
    parser.add_argument("--text", "-t", action="store_true", help="提取正文纯文本")
    parser.add_argument("--update", "-u", action="store_true", help="强制更新")

    args = parser.parse_args()
    fetch_articles(args.query, args.limit, args.text, args.update)
