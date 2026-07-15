#!/bin/bash

# 百度网盘开放平台配置脚本
# 请根据您的实际信息填写

echo "===== 百度网盘开放平台配置 ====="
echo ""
echo "您的应用信息："
echo "  AppID: 123953636"
echo "  AppKey: A1b8Wlw5OmNOtgsbkAfMUYRnuf5LugKJ"
echo "  SecretKey: 9If4vWEdxStLLvO9JOnLBWXlMHTrXiSg"
echo ""

# 设置 Cloudflare Workers Secrets
# 注意：以下命令需要您手动运行，因为涉及敏感信息

echo "请运行以下命令设置 Workers Secrets："
echo ""
echo "cd workers"
echo ""
echo "# 1. 设置百度 AppKey"
echo "wrangler secret put BAIDU_CLIENT_ID"
echo "# 输入: A1b8Wlw5OmNOtgsbkAfMUYRnuf5LugKJ"
echo ""
echo "# 2. 设置百度 SecretKey"
echo "wrangler secret put BAIDU_CLIENT_SECRET"
echo "# 输入: 9If4vWEdxStLLvO9JOnLBWXlMHTrXiSg"
echo ""
echo "# 3. 设置 Token 加密密钥（32字符随机字符串）"
echo "wrangler secret put TOKEN_ENCRYPTION_KEY"
echo "# 输入一个32字符的随机字符串，例如: aBc123XyZ789QwErTyUiOpAsDfGhJkLz"
echo ""
echo "# 4. 部署 Workers"
echo "wrangler deploy"
echo ""

# 提示配置回调 URL
echo "===== 重要：配置回调 URL ====="
echo ""
echo "部署成功后，您会获得一个 Workers 地址，例如："
echo "  https://film-index-baidu-pan.workers.dev"
echo ""
echo "请到百度网盘开放平台配置授权回调 URL："
echo "  https://film-index-baidu-pan.workers.dev/callback"
echo ""
echo "百度开放平台地址: https://pan.baidu.com/union/"
echo ""