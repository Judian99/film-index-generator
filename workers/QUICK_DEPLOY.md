# 快速部署指南

当前生产环境走的是**方式 B：EdgeOne Makers 边缘函数（同域）**。
方式 A（Cloudflare Workers）保留为回退路径。

---

## 方式 B：EdgeOne Makers（当前使用）

### 一次性准备（都已完成，此处仅备查）

1. 百度网盘开放平台创建 Web 应用，保存 **AppKey** 和 **SecretKey**。
2. 授权回调地址填 `https://www.filmindex.site/api/callback`。
3. Makers 项目已关联 Git 仓库，推 `main` 即自动构建部署。

### 日常改动后端

```bash
# 改 workers/src/ 下的代码后，直接推即可，没有构建步骤
git push origin main
```

实测从推送到线上生效约 1 分钟。函数入口在仓库根目录
`edge-functions/api/[[default]].js`，路由由目录结构生成，无需配触发规则。

### 环境变量

Makers 控制台 → 项目 → 环境变量。**只需 3 个 Secret**：

| 变量名 | 填什么 |
|--------|--------|
| `BAIDU_CLIENT_ID` | 百度控制台的 **AppKey**（不是 AppID） |
| `BAIDU_CLIENT_SECRET` | 百度控制台的 **SecretKey** |
| `TOKEN_ENCRYPTION_KEY` | 32 个 ASCII 字符的随机串 |

`FRONTEND_ORIGIN`、`FRONTEND_URL`、`API_BASE_PATH` 都有内置默认值，不必配。

### 验证

```bash
# 预期 {"logged_in":false,"user":null}
curl https://www.filmindex.site/api/status
```

返回 EdgeOne 的 404 错误页 = 函数没被路由到，去控制台看部署记录。
然后从 `https://www.filmindex.site/` 走一遍：点击「从百度网盘导入」→ 授权 → 返回 →
再次点击确认文件浏览器打开。

---

## 方式 A：Cloudflare Workers（回退）

### Windows

PowerShell 若阻止 `npx.ps1`，请改用 CMD。

```cmd
cd /d W:\film-index-generator\workers
npm install
npx wrangler login
npx wrangler secret put BAIDU_CLIENT_ID
npx wrangler secret put BAIDU_CLIENT_SECRET
npx wrangler secret put TOKEN_ENCRYPTION_KEY
npx wrangler deploy
```

### macOS/Linux

```bash
cd workers
npm install
npx wrangler login
npx wrangler secret put BAIDU_CLIENT_ID
npx wrangler secret put BAIDU_CLIENT_SECRET
npx wrangler secret put TOKEN_ENCRYPTION_KEY
npx wrangler deploy
```

依次输入百度 AppKey、百度 SecretKey，以及随机生成的 32 字节 Token 加密密钥。
终端输入的 Secret 不会写入仓库。

### 启用回退路径的前端开关

`baidu-pan-config.js` 默认走同域 `/api`。要回退到 Workers，把地址填回去：

```javascript
// 留空 = EdgeOne Makers 同域 /api；填地址 = 指向该地址
var BAIDU_PAN_API_OVERRIDE = 'https://film-index-baidu-pan.1946378724.workers.dev';
```

### 回退后的注意事项

- 百度回调地址要同步改回 `https://film-index-baidu-pan.1946378724.workers.dev/callback`，
  并重新授权。
- `wrangler.toml` 的 `FRONTEND_ORIGIN` 钉在 `https://www.filmindex.site`，
  所以必须从该域名使用；备用地址 `judian99.github.io` 会被 CORS 拒绝。
- **workers.dev 在中国大陆网络下连不通**（DNS 可解析但 TCP 超时），
  这正是当初迁移的原因。回退只适合境外访问或临时排障。

---

## 本地测试

```bash
cd workers
npx wrangler dev
```

本地 Worker 默认运行在 `http://localhost:8787`。本地跨域测试需要临时调整
`FRONTEND_ORIGIN` 和前端 API 地址，测试后不要提交这些本地值。

Makers 侧本地调试：`edgeone makers link` 关联项目后跑 `edgeone makers dev`（默认 8088 端口）。

## 安全注意事项

- 敏感值只通过 `wrangler secret put` 或 Makers 控制台设置，不写入仓库。
- 如果凭据曾进入公开提交或明文聊天，必须在百度开放平台重置，并更新对应变量。
- 更换 `TOKEN_ENCRYPTION_KEY` 后，所有现有登录 Cookie 会失效，用户需要重新授权。
- 不要提交 `.dev.vars`、`.env`、`.wrangler/` 或 `node_modules/`。
