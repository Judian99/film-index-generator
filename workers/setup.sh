#!/bin/bash

set -e

printf '%s\n' "===== EdgeOne Pages 百度网盘后端 ====="
printf '%s\n' "1. npm install"
printf '%s\n' "2. npx edgeone login"
printf '%s\n' "3. npx edgeone makers init"
printf '%s\n' "4. npx edgeone makers link"
printf '%s\n' "5. 在 EdgeOne 控制台配置 README.md 列出的环境变量"
printf '%s\n' "6. npm test && npm run edgeone:deploy"
printf '%s\n' ""
printf '%s\n' "不要将百度 Secret 或 TOKEN_ENCRYPTION_KEY 写入仓库或命令历史。"
