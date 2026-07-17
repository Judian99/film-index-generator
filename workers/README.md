# 百度网盘照片导入功能 - 部署指南

本目录包含 Cloudflare Workers API 代理服务，用于实现百度网盘照片导入功能。

---

## 架构说明

```
用户浏览器 (GitHub Pages)
    ↓ API 调用
Cloudflare Workers (本目录)
    ↓ API 调用
百度网盘开放平台 API
```

**核心特性：**
- ✅ 完全免费（Cloudflare Workers 每天 10 万次请求免费）
- ✅ 国内访问稳定（Cloudflare 在国内有 CDN 节点）
- ✅ 无需服务器（零运维）
- ✅ 用户隐私保护（图片流式传输，不落地存储）

---

## 部署步骤

### 步骤 1：注册百度网盘开放平台

1. 访问 [百度网盘开放平台](https://pan.baidu.com/union/)
2. 登录百度账号并完成实名认证
3. 创建应用：
   - 应用名称：film-index-generator（或自定义）
   - 应用类型：Web 应用
   - 应用描述：胶卷索引图生成工具，支持从百度网盘导入照片
4. 获取 `client_id` 和 `client_secret`
5. 配置授权回调 URL（步骤 3 完成后填写）

### 步骤 2：安装 Wrangler CLI

```bash
# 安装 Wrangler
npm install -g wrangler

# 登录 Cloudflare
wrangler login
```

### 步骤 3：配置环境变量

创建 Cloudflare Workers Secrets（敏感信息不提交到代码仓库）：

```bash
# 进入 workers 目录
cd workers

# 设置百度网盘 API 密钥
wrangler secret put BAIDU_CLIENT_ID
# 输入您的 client_id

wrangler secret put BAIDU_CLIENT_SECRET
# 输入您的 client_secret

wrangler secret put TOKEN_ENCRYPTION_KEY
# 输入一个 32 字符的随机字符串，用于加密 token
# 可使用: openssl rand -base64 32 | cut -c1-32
```

编辑 `wrangler.toml`，分别设置授权后的前端跳转地址和 CORS 来源：

```toml
[vars]
FRONTEND_URL = "https://your-username.github.io/film-index-generator/"
FRONTEND_ORIGIN = "https://your-username.github.io"
```

### 步骤 4：部署 Workers

```bash
# 部署到 Cloudflare
wrangler deploy
```

部署成功后，您会获得一个 Workers 地址，例如：
```
https://film-index-baidu-pan.workers.dev
```

### 步骤 5：更新前端配置

修改主项目的 `baidu-pan-config.js`：

```javascript
var BAIDU_PAN_API = 'https://film-index-baidu-pan.workers.dev';
```

### 步骤 6：配置百度网盘回调 URL

回到百度网盘开放平台，配置授权回调 URL：
```
https://film-index-baidu-pan.workers.dev/callback
```

### 步骤 7：提交审核

- 开发阶段可使用自己的百度账号测试
- 应用上线前需要提交审核
- 审核周期约 3-7 个工作日
- 准备应用说明文档和演示截图

---

## 本地开发测试

### 启动本地 Workers

```bash
cd workers
wrangler dev
```

本地 Workers 会运行在 `http://localhost:8787`

### 修改前端配置

临时修改 `baidu-pan-config.js` 指向本地：

```javascript
var BAIDU_PAN_API = 'http://localhost:8787';
```

### 启动前端本地服务器

```bash
# 在主项目目录
python -m http.server 8000
# 或
npx serve .
```

访问 `http://localhost:8000` 进行测试。

**注意：** 本地测试时，OAuth 回调需要在百度开放平台添加本地地址：
```
http://localhost:8787/callback
```

---

## 环境变量说明

| 变量名 | 说明 | 是否必需 |
|--------|------|---------|
| `BAIDU_CLIENT_ID` | 百度网盘开放平台应用 ID | ✅ 必需 |
| `BAIDU_CLIENT_SECRET` | 百度网盘开放平台应用密钥 | ✅ 必需 |
| `TOKEN_ENCRYPTION_KEY` | Token 加密密钥（32字符） | ✅ 必需 |
| `FRONTEND_URL` | OAuth 成功后的完整前端跳转地址 | ✅ 必需 |
| `FRONTEND_ORIGIN` | CORS 允许的前端来源，仅包含协议和域名 | ✅ 必需 |

---

## API 端点说明

| 端点 | 方法 | 说明 |
|------|------|------|
| `/auth` | GET | 发起 OAuth 授权，重定向到百度 |
| `/callback` | GET | OAuth 回调，换取 token 并存入 Cookie |
| `/status` | GET | 检查登录状态，返回用户信息 |
| `/files` | GET | 获取文件列表（参数：path, page, num） |
| `/download` | GET | 下载文件（参数：fs_id） |
| `/logout` | GET | 清除登录状态 |

---

## 常见问题

### 1. OAuth 授权失败

**可能原因：**
- 回调 URL 配置不正确
- Client ID 或 Client Secret 错误
- 应用未通过审核（开发阶段用测试账号）

**解决方法：**
- 检查百度开放平台的回调 URL 配置
- 确认 Workers 地址与回调 URL 一致
- 查看 Workers 日志：`wrangler tail`

### 2. 文件下载失败

**可能原因：**
- Token 过期
- 文件不存在或无权限
- 百度 API 限流

**解决方法：**
- 重新登录授权
- 检查文件是否存在于用户网盘
- 等待一段时间后重试

### 3. CORS 错误

**可能原因：**
- `FRONTEND_ORIGIN` 配置不正确
- Cookie 设置问题

**解决方法：**
- 确认 `wrangler.toml` 中的 `FRONTEND_ORIGIN` 只包含协议和域名，不包含路径
- 确保使用 HTTPS（生产环境）

### 4. Workers 脚本大小超限

Cloudflare Workers 免费版限制脚本大小 1MB。

**解决方法：**
- 检查是否有不必要的依赖
- 代码已经优化，通常不会超限

---

## 隐私与安全

### 数据处理原则

1. **图片不落地存储**
   - Workers 只代理 API 调用
   - 图片以流的方式传输到浏览器
   - Workers 不保存任何用户照片

2. **Token 安全**
   - 使用 AES-256-GCM 加密存储
   - HTTP-only Cookie 防止 XSS
   - Secure Cookie（仅 HTTPS）
   - SameSite=None 支持 GitHub Pages 到 Worker 的跨站请求

3. **最小权限**
   - 只请求 `basic` 和 `netdisk` 权限
   - 不请求上传、删除等高级权限

### 用户权利

- 用户可随时在百度网盘取消授权
- 提供登出功能清除 Cookie
- 数据仅用于生成索引图，不作他用

---

## 费用说明

### Cloudflare Workers 免费额度

| 资源 | 免费额度 |
|------|----------|
| 请求数 | 每天 10 万次 |
| CPU 时间 | 每次请求 10ms |
| 带宽 | 无限制 |

### 使用预估

对于个人应用的典型使用场景：
- 每天登录检查：1 次
- 浏览文件列表：5-10 次
- 下载照片：每张照片 1 次

**假设每天 100 个用户，每人下载 50 张照片：**
- 每天请求：约 5600 次
- **远低于 10 万次/天的免费额度**

---

## 故障排查

### 查看 Workers 日志

```bash
wrangler tail
```

### 常见错误码

| 错误码 | 说明 | 解决方法 |
|--------|------|---------|
| 401 | 未授权 | 重新登录 |
| 403 | 权限不足 | 检查应用权限配置 |
| 404 | 资源不存在 | 检查文件路径 |
| 500 | 服务器错误 | 查看日志排查 |

---

## 联系与支持

- **GitHub Issues**: [film-index-generator](https://github.com/Judian99/film-index-generator/issues)
- **百度网盘开放平台文档**: https://pan.baidu.com/union/doc/
- **Cloudflare Workers 文档**: https://developers.cloudflare.com/workers/