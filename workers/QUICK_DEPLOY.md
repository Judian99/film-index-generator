# 快速部署指南

## 您的百度网盘应用信息

- **AppID**: 123953636
- **AppKey**: A1b8Wlw5OmNOtgsbkAfMUYRnuf5LugKJ
- **SecretKey**: 9If4vWEdxStLLvO9JOnLBWXlMHTrXiSg

---

## 部署步骤（Windows）

### 1. 安装 Node.js（如果还没有）

从 https://nodejs.org/ 下载并安装 LTS 版本。

### 2. 进入 workers 目录并安装依赖

```bash
cd W:\film-index-generator\workers
npm install
```

### 3. 登录 Cloudflare

```bash
npx wrangler login
```

这会打开浏览器，请登录您的 Cloudflare 账号。如果没有账号，请先在 https://dash.cloudflare.com/sign-up 注册（免费）。

### 4. 设置 Secrets

```bash
# 设置 AppKey
npx wrangler secret put BAIDU_CLIENT_ID
# 粘贴: A1b8Wlw5OmNOtgsbkAfMUYRnuf5LugKJ

# 设置 SecretKey
npx wrangler secret put BAIDU_CLIENT_SECRET
# 粘贴: 9If4vWEdxStLLvO9JOnLBWXlMHTrXiSg

# 设置 Token 加密密钥（32字符随机字符串）
npx wrangler secret put TOKEN_ENCRYPTION_KEY
# 输入: aBc123XyZ789QwErTyUiOpAsDfGhJkLz
```

### 5. 部署

```bash
npx wrangler deploy
```

部署成功后，您会看到类似输出：

```
Published film-index-baidu-pan
  https://film-index-baidu-pan.workers.dev
```

### 6. 配置百度网盘回调 URL

1. 访问 [百度网盘开放平台](https://pan.baidu.com/union/)
2. 进入您的应用设置
3. 配置授权回调 URL：`https://film-index-baidu-pan.workers.dev/callback`

### 7. 更新前端配置

编辑主项目的 `baidu-pan-config.js`：

```javascript
export const BAIDU_PAN_API = 'https://film-index-baidu-pan.workers.dev';
```

---

## 部署步骤（Mac/Linux）

```bash
cd workers
npm install
npx wrangler login
npx wrangler secret put BAIDU_CLIENT_ID
npx wrangler secret put BAIDU_CLIENT_SECRET
npx wrangler secret put TOKEN_ENCRYPTION_KEY
npx wrangler deploy
```

---

## 本地测试

```bash
cd workers
npx wrangler dev
```

本地 Workers 会运行在 `http://localhost:8787`

临时修改 `baidu-pan-config.js`：

```javascript
export const BAIDU_PAN_API = 'http://localhost:8787';
```

然后启动前端：

```bash
cd ..
npx serve .
# 或
python -m http.server 8000
```

---

## 验证部署

1. 访问您的 GitHub Pages 地址：`https://judian99.github.io/film-index-generator`
2. 点击"从百度网盘导入"按钮
3. 应该弹出登录提示
4. 登录百度账号并授权
5. 浏览和选择照片
6. 导入到应用中

---

## 常见问题

### 1. wrangler 命令找不到

使用 `npx wrangler` 代替 `wrangler`，或全局安装：

```bash
npm install -g wrangler
```

### 2. 登录 Cloudflare 失败

- 检查网络连接
- 确保可以访问 Cloudflare
- 尝试使用代理或 VPN

### 3. 部署失败

- 检查 Workers 名称是否已被占用
- 检查网络连接
- 查看 Cloudflare Dashboard 的错误信息

### 4. OAuth 授权失败

- 确认回调 URL 配置正确
- 确认 AppKey 和 SecretKey 正确
- 检查应用是否已通过审核（开发阶段可用测试账号）