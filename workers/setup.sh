#!/bin/bash

set -e

printf '%s\n' "===== 百度网盘开放平台配置 ====="
printf '%s\n' "请确保已在百度开放平台创建应用并配置 Worker 回调地址。"
printf '%s\n' ""
printf '%s\n' "设置 Cloudflare Workers Secrets："
printf '%s\n' "  npx wrangler secret put BAIDU_CLIENT_ID"
printf '%s\n' "  npx wrangler secret put BAIDU_CLIENT_SECRET"
printf '%s\n' "  npx wrangler secret put TOKEN_ENCRYPTION_KEY"
printf '%s\n' ""
printf '%s\n' "TOKEN_ENCRYPTION_KEY 必须是随机生成的 32 字节密钥。"
printf '%s\n' "设置完成后运行："
printf '%s\n' "  npx wrangler deploy"
