# 快速部署

1. 进入后端目录并安装官方 EdgeOne CLI：

```bash
cd workers
npm install
npx edgeone login
npx edgeone makers init
npx edgeone makers link
```

2. 在 EdgeOne 控制台配置以下变量：

```text
FRONTEND_URL=https://judian99.github.io/film-index-generator/
FRONTEND_ORIGIN=https://judian99.github.io
API_ORIGIN=https://<edgeone-production-domain>
BAIDU_CLIENT_ID=<百度 AppKey>
BAIDU_CLIENT_SECRET=<百度 SecretKey>
TOKEN_ENCRYPTION_KEY=<恰好 32 个 UTF-8 字节的随机密钥>
SESSION_TTL_SECONDS=28800
HANDOFF_TTL_SECONDS=300
MAX_DOWNLOAD_BYTES=104857600
```

3. 测试并部署：

```bash
npm test
npm run edgeone:dev
npm run edgeone:deploy
```

4. 将百度开放平台 callback 改为：

```text
https://<edgeone-production-domain>/callback
```

5. 修改仓库根目录 `baidu-pan-config.js`：

```javascript
var BAIDU_PAN_API = 'https://<edgeone-production-domain>';
```

6. GitHub Pages 发布后测试登录、目录、缩略图和原图下载。默认不依赖第三方 Cookie；浏览器只在当前标签页保存 8 小时加密会话。

不要提交 `.env`、敏感变量或任何真实百度凭据。生产默认域名必须在重复部署间保持固定，不能使用 preview URL 作为 callback。
