#!/usr/bin/env python3
"""从 WeWe RSS API 获取公众号 mp_id"""
import urllib.request
import urllib.error
import json
import sys
import re

DEFAULT_URL = "http://localhost:4000"

def get_authors() -> list:
    """获取所有公众号列表"""
    url = f"{DEFAULT_URL}/feeds/authors"
    try:
        with urllib.request.urlopen(url, timeout=15) as response:
            data = json.loads(response.read().decode('utf-8'))
            return data.get('items', [])
    except urllib.error.HTTPError as e:
        print(f"API 请求失败 (HTTP {e.code}): {e.reason}", file=sys.stderr)
        return []
    except urllib.error.URLError as e:
        print(f"无法连接到服务: {e.reason}", file=sys.stderr)
        return []
    except json.JSONDecodeError as e:
        print(f"JSON 解析失败: {e}", file=sys.stderr)
        return []

def query_mp_id_by_name(name: str) -> str | None:
    """通过公众号名称模糊查询 mp_id"""
    authors = get_authors()
    if not authors:
        print("获取公众号列表失败", file=sys.stderr)
        return None

    for author in authors:
        if name.lower() in author.get('author_name', '').lower():
            mp_id = author.get('mp_id')
            print(f"找到公众号: {author.get('author_name')}, mp_id: {mp_id}")
            return mp_id

    print(f"未找到公众号: {name}", file=sys.stderr)
    return None

def query_mp_id_by_biz(biz_str: str) -> str | None:
    """通过 mp_id 部分字符串查询"""
    authors = get_authors()
    if not authors:
        print("获取公众号列表失败", file=sys.stderr)
        return None

    for author in authors:
        mp_id = author.get('mp_id', '')
        if biz_str.lower() in mp_id.lower():
            print(f"通过 __biz 找到公众号: {author.get('author_name')}, mp_id: {mp_id}")
            return mp_id

    print(f"未找到 __biz 对应的公众号: {biz_str}", file=sys.stderr)
    return None

def extract_biz_from_url(url: str) -> str | None:
    """从文章链接提取 __biz 参数"""
    match = re.search(r'__biz=([^&]+)', url)
    return match.group(1) if match else None

def get_mp_id(query: str) -> str | None:
    """根据查询条件获取 mp_id"""
    if '__biz=' in query:
        biz_str = extract_biz_from_url(query)
        if biz_str:
            return query_mp_id_by_biz(biz_str)
        print(f"无法从链接提取 __biz: {query}", file=sys.stderr)
        return None
    return query_mp_id_by_name(query)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: query_mp_id.py <公众号名称|文章链接>", file=sys.stderr)
        sys.exit(1)

    query = sys.argv[1]
    result = get_mp_id(query)

    if result:
        print(result)
    else:
        sys.exit(1)
