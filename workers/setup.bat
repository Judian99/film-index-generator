@echo off
chcp 65001 >nul
echo.
echo ===== 百度网盘开放平台配置 =====
echo.
echo 您的应用信息：
echo   AppID: 123953636
echo   AppKey: A1b8Wlw5OmNOtgsbkAfMUYRnuf5LugKJ
echo   SecretKey: 9If4vWEdxStLLvO9JOnLBWXlMHTrXiSg
echo.
echo.
echo ===== 请按以下步骤操作 =====
echo.
echo 1. 进入 workers 目录：
echo    cd workers
echo.
echo 2. 登录 Cloudflare（如果还没登录）：
echo    wrangler login
echo.
echo 3. 设置百度 AppKey：
echo    wrangler secret put BAIDU_CLIENT_ID
echo    输入: A1b8Wlw5OmNOtgsbkAfMUYRnuf5LugKJ
echo.
echo 4. 设置百度 SecretKey：
echo    wrangler secret put BAIDU_CLIENT_SECRET
echo    输入: 9If4vWEdxStLLvO9JOnLBWXlMHTrXiSg
echo.
echo 5. 设置 Token 加密密钥（32字符）：
echo    wrangler secret put TOKEN_ENCRYPTION_KEY
echo    输入一个32字符的随机字符串，例如: aBc123XyZ789QwErTyUiOpAsDfGhJkLz
echo.
echo 6. 部署 Workers：
echo    wrangler deploy
echo.
echo ===== 重要：配置回调 URL =====
echo.
echo 部署成功后，您会获得一个 Workers 地址，例如：
echo   https://film-index-baidu-pan.workers.dev
echo.
echo 请到百度网盘开放平台配置授权回调 URL：
echo   https://film-index-baidu-pan.workers.dev/callback
echo.
echo 百度开放平台地址: https://pan.baidu.com/union/
echo.
pause