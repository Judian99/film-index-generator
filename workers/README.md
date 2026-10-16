# 百度网盘照片导入功能 - 部署指南

本目录包含 Cloudflare Workers API 代理服务，用于实现百度网盘照片导入功能。

---

## 架构说明

同一份 `src/` 可以部署到两种运行时，区别只在外层适配：

```
方式 A（独立域名）                方式 B（同域，推荐）
用户浏览器 (GitHub Pages)    →    用户浏览器 + 边缘函数同域
    ↓ API 调用                        ↓ /api/* 路径
Cloudflare Workers (本目录)   →    EdgeOne 边缘函数
    ↓                                 ↓
百度网盘开放平台 API           →    百度网盘开放平台 API
```

**核心特性：**
- ✅ 完全免费（Cloudflare Workers 或 EdgeOne 免费版额度都远超本项目的用量）
- ✅ 无需服务器（零运维）
- ✅ 用户隐私保护（图片流式传输，不落地存储）

方式 B 把 API 挂在与前端相同的域名和路径前缀（`/api`）下，带来两个好处：
登录 Cookie 由第三方变一方（不再受 Safari ITP / Chrome 第三方 Cookie 收紧影响），
以及不需要 CORS。代码里已经为此预留了 `API_BASE_PATH` 配置，见部署方式 B。

---

## 部署方式 A：Cloudflare Workers

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
# 输入百度控制台的 AppKey（即 OAuth 的 client_id，不是 AppID）

wrangler secret put BAIDU_CLIENT_SECRET
# 输入百度控制台的 SecretKey（即 client_secret）

wrangler secret put TOKEN_ENCRYPTION_KEY
# 输入一个 32 字符的随机字符串，用于加密 token
# 可使用: openssl rand -base64 32 | cut -c1-32
```

编辑 `wrangler.toml`，分别设置授权后的前端跳转地址和 CORS 来源：

```toml
[vars]
FRONTEND_URL = "https://www.filmindex.site/"
FRONTEND_ORIGIN = "https://www.filmindex.site"
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

## 部署方式 B：EdgeOne 边缘函数（同域）

适用于「前端已经通过腾讯云 EdgeOne 加速 + 自定义域名对外提供服务」的场景。
API 以 `/api` 前缀挂在同一域名下，前端无需跨域访问。

> 注意：这里用的是**站点级边缘函数**（站点 → 边缘函数 → 函数管理），
> 入口是 `addEventListener('fetch', ...)`。它和 EdgeOne Makers / Pages Functions
> （`export default onRequest(context)`）不是同一套接口，不要混用。

### 步骤 1：打包成单文件

站点级边缘函数只能在控制台单文件编辑，所以要先打包：

```bash
cd workers
npm install
npm run build:edgeone
```

产物是 `workers/edgeone/dist/film-index-baidu-pan.js`（约 24 KB）。

### 步骤 2：创建并部署函数

1. EdgeOne 控制台 → 服务总览 → 你的站点 → **边缘函数 → 函数管理**
2. **新建函数**，函数名如 `film-index-baidu-pan`（字母数字连字符，2–30 字符，创建后不可改名）
3. 清空模板代码，粘贴上一步的产物，**创建并部署**

### 步骤 3：配置环境变量与密钥

在函数详情的「环境变量与密钥」模块中创建（**改完需点部署才生效**）：

| 变量名 | 类型 | 填什么 |
|--------|------|--------|
| `BAIDU_CLIENT_ID` | Secret | 百度控制台的 **AppKey**（⚠️ **不是 AppID**） |
| `BAIDU_CLIENT_SECRET` | Secret | 百度控制台的 **SecretKey** |
| `TOKEN_ENCRYPTION_KEY` | Secret | 32 个 ASCII 字符的随机串，自备 |
| `FRONTEND_URL` | String | `https://www.filmindex.site/` |
| `FRONTEND_ORIGIN` | String | `https://www.filmindex.site` |
| `API_BASE_PATH` | String | `/api`，必须与触发规则一致 |

> ⚠️ **`client_id` 填 AppKey 而不是 AppID** 是百度这边最常见的坑：填 AppID 时授权页照常打开
> （不校验），但换 token 那一步会失败，且报错信息指向不了根因。
> 用 AppKey/SecretKey 在 `workers/src/lib/baidu-pan.js` 的换 token 请求里才对得上。

Secret 类型保存后不可再查看，请先妥善保存。变量名创建后不可修改。

### 步骤 4：配置触发规则

在函数详情点「新增触发规则」，匹配：

| 匹配类型 | 运算符 | 值 |
|----------|--------|-----|
| URL Path | 通配符匹配 | `/api/*` |

### 步骤 5：切换前端入口

回到主项目，编辑 `baidu-pan-config.js`，把 `BAIDU_PAN_API_OVERRIDE` 置为空字符串：

```javascript
var BAIDU_PAN_API_OVERRIDE = '';
```

前端即自动使用 `location.origin + '/api'`。回退到方式 A 时把 Workers 地址填回来即可。

### 步骤 6：更新百度回调地址并重新授权

在百度开放平台应用详情页的【安全配置】里，把授权回调地址改为：

```
https://www.filmindex.site/api/callback
```

必须与 EdgeOne 上的实际地址**逐字一致**，否则换 token 会被拒。

改完后**必须重新走一次授权**——旧 Cookie 是按旧回调地址换来的，且浏览器里
可能还留着指向旧域名的登录态。

### 运行时限制（部署前需知）

| 项 | 限制 | 对本项目的影响 |
|----|------|---------------|
| 入口 | 只允许注册**一个** `fetch` 监听器 | 已符合 |
| 单次 CPU | 200 ms（不含 I/O 等待） | `/files` 大目录是唯一风险点，建议压测 |
| `fetch` 次数 | 单次运行最多 64 次、最多 8 并发 | 目录分页上限 20 次 + imagelist 1 次，安全 |
| `fetch` 超时 | 默认 15 s，最大可配 300 s | 慢网下下载大原图可能被截断 |
| 代码包 | 5 MB | 产物约 24 KB |
| 环境变量 | 最多 64 个，值 ≤ 5 KB，**创建后不可改名** | 够用 |
| 日志 | 免费版无日志分析/离线日志 | 排障比 `wrangler tail` 困难 |

`/download` 走的是流式转发（`new Response(response.body, ...)`），
边缘函数支持 `ReadableStream` 响应体，大文件不会被读进内存。

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
| `BAIDU_CLIENT_ID` | 百度控制台的 **AppKey**（对应 OAuth 的 `client_id`，不是 AppID） | ✅ 必需 |
| `BAIDU_CLIENT_SECRET` | 百度控制台的 **SecretKey**（对应 `client_secret`） | ✅ 必需 |
| `TOKEN_ENCRYPTION_KEY` | Token 加密密钥（32字符） | ✅ 必需 |
| `FRONTEND_URL` | OAuth 成功后的完整前端跳转地址 | ✅ 必需 |
| `FRONTEND_ORIGIN` | CORS 允许的前端来源，仅包含协议和域名 | ✅ 必需 |
| `API_BASE_PATH` | 部署路径前缀，如 `/api`；独立域名部署时留空 | 方式 B 必需 |
| `COOKIE_SAME_SITE` | 登录 Cookie 的 SameSite，默认 `None`（配合 Secure 跨站） | 可选 |

---

## API 端点说明

| 端点 | 方法 | 说明 |
|------|------|------|
| `/auth` | GET | 发起 OAuth 授权，重定向到百度 |
| `/callback` | GET | OAuth 回调，换取 token 并存入 Cookie |
| `/status` | GET | 检查登录状态，返回用户信息 |
| `/files` | GET | 获取文件列表（参数：path；目录与图片合并去重后返回，并为图片签发缩略图票据） |
| `/thumbnail` | GET | 缩略图代理（参数：ticket，由 `/files` 签发，绑定账号且 1 小时有效） |
| `/download` | GET | 流式下载文件（参数：fs_id） |
| `/logout` | GET | 清除登录状态 |

公共工具位于 `src/lib/http.js`（CORS 头、JSON 响应、Cookie token 解析、账号指纹），新增端点直接复用。

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