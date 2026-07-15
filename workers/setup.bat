@echo off
chcp 65001 >nul
echo.
echo ===== 百度网盘开放平台配置 =====
echo.
echo 请确保已在百度开放平台创建应用并配置 Worker 回调地址。
echo.
echo 设置 Cloudflare Workers Secrets：
echo   npx wrangler secret put BAIDU_CLIENT_ID
echo   npx wrangler secret put BAIDU_CLIENT_SECRET
echo   npx wrangler secret put TOKEN_ENCRYPTION_KEY
echo.
echo TOKEN_ENCRYPTION_KEY 必须是随机生成的 32 字节密钥。
echo 设置完成后运行：
echo   npx wrangler deploy
echo.
pause
