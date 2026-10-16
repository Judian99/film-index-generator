# 快速部署指南

## 准备百度网盘应用

在百度网盘开放平台创建 Web 应用，保存 AppKey 和 SecretKey，不要将它们写入代码、文档或提交到 Git。

将授权回调地址配置为：

```text
https://film-index-baidu-pan.1946378724.workers.dev/callback
```

## Windows 部署

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

依次输入百度 AppKey、百度 SecretKey，以及随机生成的 32 字节 Token 加密密钥。终端输入的 Secret 不会写入仓库。

## macOS/Linux 部署

```bash
cd workers
npm install
npx wrangler login
npx wrangler secret put BAIDU_CLIENT_ID
npx wrangler secret put BAIDU_CLIENT_SECRET
npx wrangler secret put TOKEN_ENCRYPTION_KEY
npx wrangler deploy
```

## 前端配置

`baidu-pan-config.js` 现在是「留空走同域 `/api`，填地址则指向该地址」：

```javascript
// 回退到 Cloudflare Workers 时填写；留空则走 EdgeOne 同域 /api
var BAIDU_PAN_API_OVERRIDE = 'https://film-index-baidu-pan.1946378724.workers.dev';
```

## 验证部署

> 注意：`wrangler.toml` 里的 `FRONTEND_ORIGIN` 已钉在 `https://www.filmindex.site`，
> 因此必须从该域名访问验证。备用地址 `judian99.github.io` 只能验证前端渲染，
> 百度导入会失败（`FRONTEND_ORIGIN` 未放行它，切换覆盖地址后还会变成 404）。

1. 访问 `https://www.filmindex.site/`。
2. 点击“从百度网盘导入”。
3. 完成百度授权并返回应用。
4. 再次点击导入按钮，确认文件浏览器正常打开。
5. 选择照片并验证导入和处理流程。

## 本地测试

```bash
cd workers
npx wrangler dev
```

本地 Worker 默认运行在 `http://localhost:8787`。本地跨域测试需要临时调整 `FRONTEND_ORIGIN` 和前端 API 地址，测试后不要提交这些本地值。

## 安全注意事项

- 只通过 `wrangler secret put` 设置敏感值。
- 如果凭据曾进入公开提交，必须在百度开放平台重置，并更新 Cloudflare Secrets。
- 更换 `TOKEN_ENCRYPTION_KEY` 后，所有现有登录 Cookie 会失效，用户需要重新授权。
- 不要提交 `.dev.vars`、`.env`、`.wrangler/` 或 `node_modules/`。
