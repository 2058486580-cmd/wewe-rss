#!/usr/bin/env python3
"""从 WeWe RSS API 获取公众号文章列表"""
import sys
import json
import urllib.request
import urllib.error

DEFAULT_URL = "http://localhost:4000"

def get_articles(mp_id: str, limit: int = 10, update: bool = False) -> list:
    """获取公众号文章列表（JSON Feed 格式）"""
    url = f"{DEFAULT_URL}/feeds/{mp_id}.json?limit={limit}"
    if update:
        url += "&update=true"

    try:
        with urllib.request.urlopen(url, timeout=15) as response:
            data = json.loads(response.read().decode('utf-8'))
            # JSON Feed 格式：文章在 items 数组中
            items = data.get('items', [])
            # 转换格式以保持兼容性
            articles = []
            for item in items:
                articles.append({
                    'title': item.get('title', ''),
                    'url': item.get('url', ''),
                    'date_modified': item.get('date_modified', item.get('date_published', '')),
                    'content': item.get('content_html', item.get('content_text', '')),
                    'image': item.get('image', '')
                })
            return articles
    except urllib.error.HTTPError as e:
        print(f"API 请求失败 (HTTP {e.code}): {e.reason}", file=sys.stderr)
        if e.code == 401:
            print("需要检查 AUTH_CODE 配置", file=sys.stderr)
        return []
    except urllib.error.URLError as e:
        print(f"无法连接到服务: {e.reason}", file=sys.stderr)
        return []
    except json.JSONDecodeError as e:
        print(f"JSON 解析失败: {e}", file=sys.stderr)
        return []

def get_articles_to_file(mp_id: str, limit: int = 10, update: bool = False, output_file: str = None):
    """获取文章并可选地保存到文件"""
    articles = get_articles(mp_id, limit, update)
    if not articles:
        print("未获取到文章", file=sys.stderr)
        sys.exit(1)

    if output_file:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(articles, f, ensure_ascii=False, indent=2)
        print(f"文章已保存到: {output_file}")
    else:
        print(json.dumps(articles, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="获取微信公众号文章")
    parser.add_argument("mp_id", help="公众号 mp_id")
    parser.add_argument("--limit", "-n", type=int, default=10, help="返回文章数量")
    parser.add_argument("--update", "-u", action="store_true", help="强制从微信读书更新")
    parser.add_argument("--output", "-o", help="输出文件路径")

    args = parser.parse_args()
    get_articles_to_file(args.mp_id, args.limit, args.update, args.output)
