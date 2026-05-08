# SKILL.md - 读取微信公众号文章

## 触发条件
用户要求读取某个公众号的文章列表，或读取某篇文章的正文内容时激活。

## 前置条件
WeWe RSS Docker 服务必须已部署并运行在 `http://localhost:4000`。
- 如果服务未运行 → 调用 `wewe-rss-deploy` Skill 进行部署
- 部署完成后继续执行以下流程

## API 接口

| 接口 | 说明 |
|------|------|
| `GET /feeds/authors` | 获取所有公众号列表（mp_id + author_name） |
| `GET /feeds/{mp_id}.json` | 获取公众号文章列表 |

## 脚本说明

| 脚本 | 功能 |
|------|------|
| `scripts/check_service.py` | 检查 Docker 服务是否运行 |
| `scripts/query_mp_id.py` | 查询公众号 mp_id（通过 /feeds/authors API） |
| `scripts/get_articles.py` | 获取文章列表 |
| `scripts/extract_text.py` | 从 HTML 提取纯文本 |
| `scripts/fetch_articles.py` | 整合脚本：获取并显示文章 |

## 工作流程

### Step 1：检查服务状态

```bash
python scripts/check_service.py
```
- 如果失败 → 调用 `wewe-rss-deploy` Skill

### Step 2：获取公众号 mp_id

**方式 A：通过公众号名称查询**
```bash
python scripts/query_mp_id.py "第一财经"
```

**方式 B：通过文章链接查询**
```bash
python scripts/query_mp_id.py "https://mp.weixin.qq.com/s/xxxxxxxxx?__biz=MTI0OTk2xxx"
```

### Step 3：获取文章列表

```bash
python scripts/get_articles.py <mp_id> --limit 10
python scripts/get_articles.py <mp_id> --limit 5 --update  # 强制更新
python scripts/get_articles.py <mp_id> --output articles.json  # 保存到文件
```

### Step 4：提取正文纯文本

```bash
# 从 HTML 文件提取文本
python scripts/extract_text.py < article.html
```

### Step 5：一站式获取文章

```bash
python scripts/fetch_articles.py "第一财经" --limit 5 --text
```

## API 详情

### GET /feeds/authors

返回格式：
```json
{
  "items": [
    {
      "mp_id": "MP_WXS_2391375304",
      "author_name": "第一财经",
      "intro": "...",
      "cover": "...",
      "status": 1,
      "sync_time": ...,
      "update_time": ...
    }
  ]
}
```

### GET /feeds/{mp_id}.json

响应格式（JSON Feed）：
```json
{
  "version": "https://jsonfeed.org/version/1",
  "title": "第一财经",
  "items": [
    {
      "id": "...",
      "title": "文章标题",
      "url": "https://mp.weixin.qq.com/s/...",
      "content_html": "<article HTML>",
      "image": "https://mmbiz.qpic.cn/...",
      "date_modified": "2026-04-02T02:20:36.000Z",
      "author": { "name": "第一财经" }
    }
  ]
}
```

## 错误处理

| 错误 | 原因 | 处理方式 |
|------|------|----------|
| `check_service.py` 失败 | 服务未运行 | 运行 `docker-compose up -d` |
| 获取 authors 失败 | API 服务异常 | 检查容器状态 |
| API 返回 401 | AUTH_CODE 不匹配 | 检查 docker-compose.yml 中的 AUTH_CODE |
| `content` 为空 | 文章未缓存 | 使用 `--update` 参数强制更新 |
| `mp_id` 为空 | 公众号未订阅 | 先在 Web UI 中订阅公众号 |

## 注意事项

1. **服务地址**：`http://localhost:4000`
2. **首次使用**：需要先在 Web UI 登录微信读书账号并订阅公众号
3. **AUTH_CODE**：如果 API 返回 401，检查 docker-compose.yml 中的 AUTH_CODE 配置
