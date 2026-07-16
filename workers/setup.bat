@echo off
chcp 65001 >nul
echo.
echo ===== EdgeOne Pages 百度网盘后端 =====
echo.
echo 1. npm install
echo 2. npx edgeone login
echo 3. npx edgeone makers init
echo 4. npx edgeone makers link
echo 5. 在 EdgeOne 控制台配置 README.md 列出的环境变量
echo 6. npm test ^&^& npm run edgeone:deploy
echo.
echo 不要将百度 Secret 或 TOKEN_ENCRYPTION_KEY 写入仓库或命令历史。
echo.
pause
