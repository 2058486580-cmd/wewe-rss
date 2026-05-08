---
name: wewe-rss
description: 读取微信公众号文章。当用户要求读取某个公众号的文章列表、获取文章正文、或通过公众号名称搜索文章时激活。支持直接提供公众号名称、文章链接或 mp_id。
---
# 读取微信公众号文章

## 前置条件

WeWe RSS Docker 服务必须已部署并运行在 `http://localhost:4000`。

## 工作流程

### Step 1: 检查服务状态

```bash
python scripts/check_service.py
```

### Step 2: 获取公众号 mp_id

通过公众号名称或文章链接查询 mp_id：

```bash
python scripts/query_mp_id.py "财联社"
python scripts/query_mp_id.py "https://mp.weixin.qq.com/s/xxx?__biz=MTI0OTk2xxx"
```

### Step 3: 获取文章列表

```bash
python scripts/get_articles.py <mp_id> --limit 10
python scripts/get_articles.py <mp_id> --limit 5 --update
```

### Step 4: 一站式获取（推荐）

直接通过公众号名称获取文章：

```bash
python scripts/fetch_articles.py "财联社" --limit 5 --text
```

## API 接口


| 接口                      | 说明                                      |
| ------------------------- | ----------------------------------------- |
| `GET /authors`            | 获取所有公众号列表（mp_id + author_name） |
| `GET /feeds/{mp_id}.json` | 获取公众号文章列表                        |

## 错误处理


| 错误           | 处理方式                     |
| -------------- | ---------------------------- |
| 服务未运行     | 检查 Docker 容器状态         |
| AUTH_CODE 错误 | 检查 docker-compose.yml 配置 |
| 文章内容为空   | 使用`--update` 强制刷新      |
