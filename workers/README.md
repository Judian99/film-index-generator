# EdgeOne Pages 百度网盘后端部署

前端继续部署在 GitHub Pages，本目录只部署百度 OAuth、目录读取、缩略图和原图代理。

## 架构

```text
GitHub Pages 前端
  -> Authorization: Bearer <短期加密会话>
EdgeOne Pages Edge Functions
  -> 百度网盘开放平台 API
```

浏览器不保存百度 access token，也不依赖第三方 Cookie。EdgeOne callback 通过 URL fragment 返回一个 5 分钟 handoff，前端用当前标签页保存的 verifier 换取 8 小时加密会话。关闭标签页会清除 `sessionStorage`。

## 1. 准备百度应用

在百度网盘开放平台创建 Web 应用，保存 AppKey 和 SecretKey。首次部署 EdgeOne 后，将授权回调设置为固定 production 默认域名：

```text
https://<edgeone-production-domain>/callback
```

不要使用每次部署可能变化的 preview URL。

## 2. 安装并初始化

```bash
cd workers
npm install
npx edgeone login
npx edgeone makers init
npx edgeone makers link
```

初始化时保留现有 `edge-functions/`，不要覆盖其中的路由。`link` 用于关联 Direct Upload 项目和同步控制台环境变量。

## 3. 配置生产环境变量

在 EdgeOne 项目控制台配置：

| 变量 | 值 |
|---|---|
| `FRONTEND_URL` | `https://judian99.github.io/film-index-generator/` |
| `FRONTEND_ORIGIN` | `https://judian99.github.io` |
| `API_ORIGIN` | `https://<edgeone-production-domain>` |
| `BAIDU_CLIENT_ID` | 百度 AppKey |
| `BAIDU_CLIENT_SECRET` | 百度 SecretKey |
| `TOKEN_ENCRYPTION_KEY` | 随机且恰好 32 个 UTF-8 字节 |
| `SESSION_TTL_SECONDS` | `28800` |
| `HANDOFF_TTL_SECONDS` | `300` |
| `MAX_DOWNLOAD_BYTES` | `104857600` |

不要把敏感变量写进仓库、命令历史或截图。更换加密密钥会让所有现有会话失效。

## 4. 测试与部署

```bash
npm test
npm run edgeone:dev
npm run edgeone:deploy
```

连续执行两次 production 部署，确认 production 默认域名保持不变，再配置百度 callback。

## 5. 切换 GitHub Pages

部署成功后修改仓库根目录 `baidu-pan-config.js`：

```javascript
var BAIDU_PAN_API = 'https://<edgeone-production-domain>';
```

提交并等待 GitHub Pages 发布。未填写该地址时，百度网盘入口会明确提示尚未配置，不会回退到旧 Cloudflare Worker。

## API

| 端点 | 方法 | 认证 | 说明 |
|---|---|---|---|
| `/auth` | GET | challenge | 跳转百度授权 |
| `/callback` | GET | OAuth state | 百度回调并生成 handoff |
| `/auth/exchange` | POST | verifier | 换取短期加密会话 |
| `/status` | GET | Bearer | 检查授权状态 |
| `/files` | GET | Bearer | 读取目录和缩略图票据 |
| `/thumbnail` | GET | 短期 ticket | 流式代理低清图 |
| `/download` | GET | Bearer | 流式代理原图 |
| `/logout` | POST | Origin | 清理前端会话 |

## 安全边界

- 百度 Secret 和 access token 只在 EdgeOne 函数中出现。
- 浏览器 `sessionStorage` 保存的是 AES-GCM 加密的 8 小时会话，不是明文百度 token。
- 无状态会话无法在服务端即时吊销；登出会清除当前标签页凭证，密文最晚在 8 小时后失效。用户也可在百度侧取消应用授权。
- 缩略图 ticket 有效 10 分钟，只允许读取单张低清图，不授予目录或原图权限。
- 原图默认最大 100 MiB，函数只流式转发，不落地、不在服务端缓冲完整文件。
- CORS 只允许 `https://judian99.github.io`，不使用跨站 Cookie。

## 上线验收

1. Chrome 禁止第三方 Cookie、Firefox 和 Safari/隐私模式均能登录。
2. callback 返回后地址栏 fragment 立即消失。
3. 浏览器历史、Network 和 EdgeOne 日志中没有明文百度 token、Client Secret 或完整 dlink。
4. 目录、跨目录多选、缩略图、裁切/旋转、拍摄时间排序和导出正常。
5. 测试 5、25、75、100 MiB 原图以及两个 75 MiB 并发请求；确认无截断、超时或 EdgeOne 5xx。
6. 切换后保留旧 Cloudflare Worker 48 小时；回滚时必须同时恢复旧前端、API 地址和百度 callback。
