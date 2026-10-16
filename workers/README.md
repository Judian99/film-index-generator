# 百度网盘照片导入功能 - 部署指南

本目录包含百度网盘照片导入的后端代理服务。生产环境跑在 EdgeOne Makers 上
（适配层在仓库根目录的 `edge-functions/`），也可部署到 Cloudflare Workers 作为回退。

---

## 架构说明

同一份 `src/` 可以部署到两种运行时，区别只在外层适配：

```
方式 A（独立域名，回退）           方式 B（同域，当前使用）
用户浏览器 (GitHub Pages)    →    用户浏览器 + 函数同域
    ↓ API 调用                        ↓ /api/* 路径
Cloudflare Workers (本目录)   →    EdgeOne Makers 边缘函数 (edge-functions/)
    ↓                                 ↓
百度网盘开放平台 API           →    百度网盘开放平台 API
```

**核心特性：**
- ✅ 完全免费（EdgeOne Makers 免费版额度远超本项目的用量）
- ✅ 无需服务器（零运维）
- ✅ 用户隐私保护（图片流式传输，不落地存储）

方式 B 把 API 挂在与前端相同的域名和路径前缀（`/api`）下，带来两个好处：
登录 Cookie 由第三方变一方（不再受 Safari ITP / Chrome 第三方 Cookie 收紧影响），
以及不需要 CORS。

> ⚠️ 方式 B 用的是 **EdgeOne Makers** 的边缘函数，入口是 `export default onRequest(context)`。
> 它和「边缘安全加速平台 EO」的**站点级边缘函数**（`addEventListener`）是两套不兼容的接口。
> 混用会导致函数完全不生效，且表现为一个普通 404，很难察觉。辨析方法见部署方式 B 开头。

---

## 部署方式 B：EdgeOne Makers 边缘函数（同域）

适用于「前端通过腾讯云 EdgeOne 加速 + 自定义域名对外提供服务」的场景。
API 以 `/api` 前缀挂在同一域名下，前端无需跨域访问。

### 先确认你的站点跑在哪个产品上

EdgeOne 有**两套互不兼容**的边缘函数接口，选错直接跑不起来：

| | 站点级边缘函数 | EdgeOne Makers 边缘函数 |
|---|---|---|
| 入口签名 | `addEventListener('fetch', ...)` | `export default onRequest(context)` |
| 环境变量 | 全局 `env` | `context.env` |
| 代码组织 | 控制台单文件编辑 | 项目 `edge-functions/` 目录，由 Git/CLI 部署 |
| 路由 | 在触发规则里配 URL Path | 由目录结构自动生成 |

**怎么区分**：打一个不存在的路径，看响应头。

```bash
curl -i https://你的域名/api/nope
```

返回 `Server: edgeone makers`、错误页指向 `pages.edgeone.ai` → 你的站点在 **Makers** 上，
下文即为此方案。若能在「边缘安全加速平台 EO → 站点 → 边缘函数」下建函数，
说明走的是站点级方案，本仓库不再提供该适配。

> Makers 官方文档明确写了 **「Edge Functions 不支持使用 addEventListener」**，
> 两套接口不能混用。站点级那套单文件适配器曾经存在过，已从仓库移除。

### 部署结构

函数只有一个文件，位于仓库根目录：

```
edge-functions/
└── api/
    └── [[default]].js   ← 接管 /api/* 全部路径
```

路由由目录结构生成，所以 `/api` 前缀是「放对目录」换来的，不用配触发规则。
该文件只做一层适配，把请求转交给 `workers/src/index.js`，
因此 Cloudflare Workers 与 Makers 共用同一份业务代码。

### 步骤 1：推送代码

Makers 项目已关联 Git 仓库，**推送即自动构建部署**，不需要往控制台粘贴任何代码：

```bash
git push origin main
```

推送后可在控制台「部署记录」里看到本次构建。实测从推送到线上生效约 **1 分钟**。

### 步骤 2：配置环境变量与密钥

在 **EdgeOne Makers 控制台 → 你的项目 → 环境变量**（不是 EO 站点控制台）。

只有 3 个是必需的，且都应建为 **Secret** 类型：

| 变量名 | 填什么 |
|--------|--------|
| `BAIDU_CLIENT_ID` | 百度控制台的 **AppKey**（⚠️ **不是 AppID**） |
| `BAIDU_CLIENT_SECRET` | 百度控制台的 **SecretKey** |
| `TOKEN_ENCRYPTION_KEY` | 32 个 ASCII 字符的随机串，自备 |

以下变量**有内置默认值，通常不必配**，需要覆盖时再建：

| 变量名 | 默认值 | 何时需要 |
|--------|--------|----------|
| `FRONTEND_ORIGIN` | `https://www.filmindex.site` | 换域名时；同时决定 CORS 放行的来源 |
| `FRONTEND_URL` | `FRONTEND_ORIGIN` + `/` | 授权后要跳到别处时 |
| `COOKIE_SAME_SITE` | `None` | 同域部署可改 `Lax`，更抗浏览器策略变化 |
| `API_BASE_PATH` | 由适配器写死 `/api` | 不需要配 |

> ⚠️ **`client_id` 填 AppKey 而不是 AppID** 是百度这边最常见的坑：填 AppID 时授权页照常打开
> （那一端不校验），但换 token 会失败，且报错信息指向不了根因。

### 步骤 3：改百度回调地址并重新授权

在百度开放平台应用详情页的【安全配置】里，把授权回调地址改为：

```
https://www.filmindex.site/api/callback
```

必须与线上实际地址**逐字一致**，否则换 token 会被拒。改完后**必须重新走一次授权**——
旧 Cookie 是按旧回调地址换来的。

### 免费版配额

| 项 | 免费版 |
|----|--------|
| Edge Functions 执行次数 | 300 万次/月 |
| Edge Functions CPU 时间 | 300 万 ms/月 |
| 代码包大小 | 5 MB |
| 请求 body 大小 | 1 MB |
| 项目构建次数 | 500 次/月（并发 1，单次最长 20 分钟） |

官方文档**没有给出**内存规格与单次执行超时——这两个数在站点级产品里是有的
（128 MB / 200 ms CPU），不要套用到 Makers 上。免费版目前为限时免费，
官方声明商业化后配额可能调整。

`/download` 走流式转发（`new Response(response.body, ...)`），大文件不会被读进内存。

### 排障

Makers 免费版**没有日志分析/离线日志**，比 `wrangler tail` 难查。可用手段：

1. `curl https://你的域名/api/status` —— 预期 `{"logged_in":false,"user":null}`。
   若返回 EdgeOne 的 404 错误页，说明请求没被路由到函数：检查
   `edge-functions/api/` 目录层级是否拼对、以及项目是否真的重新构建过。
2. 控制台 → 项目 → **部署记录**，确认构建成功且函数被识别。
3. 本地调试：`edgeone makers link` 关联项目后跑 `edgeone makers dev`（默认 8088 端口）。

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
var BAIDU_PAN_API_OVERRIDE = 'https://film-index-baidu-pan.workers.dev';
```

留空则走同域 `/api`（方式 B）。

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

本地起前端时 `baidu-pan-config.js` 会自动指向 `http://localhost:8787`（见该文件的
hostname 判断），通常不用改。要指向别处才填 `BAIDU_PAN_API_OVERRIDE`：

```javascript
var BAIDU_PAN_API_OVERRIDE = 'http://localhost:8787';
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
| `FRONTEND_ORIGIN` | CORS 允许的前端来源，仅含协议和域名；默认 `https://www.filmindex.site` | 换域名时 |
| `FRONTEND_URL` | OAuth 成功后的完整跳转地址；默认 `FRONTEND_ORIGIN` + `/` | 可选 |
| `API_BASE_PATH` | 部署路径前缀，如 `/api`；独立域名部署时留空。方式 B 由 `edge-functions/api/[[default]].js` 写死 | 方式 A 可选 |
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
- 回调 URL 配置不正确（最常见）
- `BAIDU_CLIENT_ID` 填成了 AppID 而非 AppKey
- 应用未通过审核（开发阶段用测试账号）

**解决方法：**
- 检查百度开放平台的回调 URL 与线上实际地址**逐字一致**
- 确认 `BAIDU_CLIENT_ID` 是 **AppKey**
- 方式 A 看日志：`wrangler tail`；方式 B 见上文「排障」

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

**原因：** `FRONTEND_ORIGIN` 只放行一个来源，从别的域名访问必然被拒。

**解决方法：**
- 确认它只包含协议和域名，不含路径
- 方式 B 是同域部署，正常不该出现 CORS 错误；出现了多半是前端仍指向旧的后端地址
  （检查 `baidu-pan-config.js` 的 `BAIDU_PAN_API_OVERRIDE`）

### 4. `/api/*` 返回 EdgeOne 的 404 页面

说明请求没被路由到函数，**不是**代码报错。依次检查：

- 文件是否在仓库根目录的 `edge-functions/api/` 下（不是 `workers/` 里）
- 项目是否真的重新构建过（控制台 → 部署记录）
- 函数写的是不是 Makers 的 `onRequest(context)` 接口

---

## 隐私与安全

### 数据处理原则

1. **图片不落地存储**
   - 边缘函数只代理 API 调用
   - 图片以流的方式传输到浏览器
   - 不保存任何用户照片

2. **Token 安全**
   - 使用 AES-256-GCM 加密存储
   - HTTP-only Cookie 防止 XSS
   - Secure Cookie（仅 HTTPS）
   - SameSite 默认 `None`（配合 Secure）以兼容方式 A 的跨站场景；
     方式 B 同域部署可改为 `Lax` 收紧

3. **最小权限**
   - 只请求 `basic` 和 `netdisk` 权限
   - 不请求上传、删除等高级权限

### 用户权利

- 用户可随时在百度网盘取消授权
- 提供登出功能清除 Cookie
- 数据仅用于生成索引图，不作他用

---

## 费用说明

### EdgeOne Makers 免费额度

方式 B 的额度见上文「免费版配额」（300 万次/月、300 万 ms CPU/月、构建 500 次/月）。
方式 A 的 Cloudflare Workers 免费额度是每天 10 万次请求、每次请求 10ms CPU。

### 使用预估

对于个人应用的典型使用场景：
- 每天登录检查：1 次
- 浏览文件列表：5-10 次
- 下载照片：每张照片 1 次

**假设每天 100 个用户，每人下载 50 张照片：**
- 每天请求：约 5600 次 → 每月约 17 万次
- **远低于 300 万次/月的免费额度**

---

## 故障排查

### 查看日志

方式 A：

```bash
wrangler tail
```

方式 B：Makers 免费版没有日志分析，见上文「排障」一节。

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