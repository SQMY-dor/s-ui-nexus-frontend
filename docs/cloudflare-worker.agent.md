---
title: 部署 S-UI Nexus 前端到 Cloudflare Workers（AI 执行手册）
audience: AI agent / 自动化脚本
human_doc: docs/cloudflare-worker.md
repo: SQMY-dor/s-ui-nexus-frontend
entrypoints: [cloudflare/build.mjs, cloudflare/worker.js]
output_dir: .cf/
---

# 目标
把面板前端部署为 Cloudflare Worker：静态资源走 Workers Static Assets；只有 `${WEB_PATH}api`、`${WEB_PATH}apiv2`、`${WEB_PATH}apiv3`（及其 `/*`）进入 Worker，被同源转发到 `${ORIGIN}`。不修改后端。

# 输入（执行前必须确定，缺失则向用户询问，不要猜）
| 变量 | 必填 | 格式 | 默认 | 说明 |
|---|---|---|---|---|
| `ORIGIN` | 是 | `https://host[:port]`，无路径、无结尾斜杠以外的内容 | 无 | 面板源站。必须是域名，不能是裸 IP（Workers 不能直连 IP） |
| `EDGE_DOMAIN` | 是 | 主机名 | 无 | 绑定到 Worker 的自定义域名，所在 zone 必须托管在 Cloudflare |
| `WEB_PATH` | 否 | `/xxx/` | `/app/` | 必须等于面板设置里的 Web 路径 |
| `WORKER_NAME` | 否 | 小写字母数字和 `-` | `s-ui-nexus-web` | |
| `ORIGIN_SECRET` | 否 | 随机字符串 | 无 | 设置后 Worker 发送 `X-Nexus-Edge-Secret` 头 |
| `CLOUDFLARE_API_TOKEN` | 是 | | | 需要 Workers Scripts:Edit、Workers Routes:Edit（或 Zone:Workers Routes）、目标 zone 的读权限 |
| `CLOUDFLARE_ACCOUNT_ID` | 视情况 | | | Token 可访问多个账户时必填 |

# 前置条件（逐条检查，不满足就停止并报告）
1. `node -v` ≥ 20，`npm` 可用。
2. 前端仓库检出的版本与面板后端版本一致（接口随版本变化）。
3. `curl -sS -o /dev/null -w '%{http_code}' ${ORIGIN}${WEB_PATH}api/auth-check` 返回 HTTP 状态码（任意 2xx/3xx/4xx 都表示可达；000 或 5xx 表示不可达，停止）。
4. 若面板设置了 Web 域名（webDomain），其值必须为空或等于 `ORIGIN` 的主机名；否则后端 DomainValidator 返回 403。

# 步骤
```bash
# 1. 安装依赖
npm ci

# 2. 构建（会先跑 vue-tsc 和 vite build，再生成 .cf/）
WEB_PATH="${WEB_PATH:-/app/}" ORIGIN="$ORIGIN" WORKER_NAME="${WORKER_NAME:-s-ui-nexus-web}" npm run build:cf

# 3. 预检（不上传）
npx wrangler deploy --dry-run -c .cf/wrangler.jsonc

# 4. 可选：设置源站密钥
[ -n "$ORIGIN_SECRET" ] && printf '%s' "$ORIGIN_SECRET" | npx wrangler secret put ORIGIN_SECRET -c .cf/wrangler.jsonc

# 5. 部署并绑定自定义域名
npx wrangler deploy -c .cf/wrangler.jsonc --domain "$EDGE_DOMAIN"
```
说明：
- 步骤 2 的预期输出最后一行：`Deploy: npx wrangler deploy -c .cf/wrangler.jsonc`。
- 不要手改 `.cf/`，它每次构建都会被删除重建；要改配置请改 `cloudflare/build.mjs`。
- 步骤 4 要在第一次 deploy 之后才能执行（脚本需已存在）；首次部署时按 5 → 4 → 5 的顺序执行。

# 验证（全部通过才算完成）
```bash
E="https://$EDGE_DOMAIN"; P="${WEB_PATH:-/app/}"
curl -sI "$E/" | grep -i '^location: '"$P"                                   # / 302 到 WEB_PATH
curl -s "$E$P" | grep -q "window.BASE_URL = \"$P\""                           # 已注入 BASE_URL
curl -s -H 'Sec-Fetch-Mode: navigate' "$E${P}nodes" | grep -q '<div id="app">' # 深链接返回 SPA
curl -sI "$E${P}assets/favicon.ico" | grep -qi 'immutable'                    # 静态资源长缓存
curl -s "$E${P}api/auth-check" | grep -q '"success"'                          # API 经 Worker 回源（未登录也返回 JSON）
```
任一失败，按下表排查，最多重试两次，仍失败则停下报告。

# 故障对照
| 现象 | 原因 | 处理 |
|---|---|---|
| API 返回 502 `edge: origin unreachable` | ORIGIN 不可达、是裸 IP、或端口不被 Workers 允许 | 用 443 上的域名做源站（可用面板「域名与证书 → nginx 反代」） |
| API 返回 403 | webDomain 与回源 Host 不一致，或 nginx 的 `ORIGIN_SECRET` 校验不匹配 | 清空 webDomain 或设为 ORIGIN 主机名；核对密钥 |
| 页面空白、assets 404 | `WEB_PATH` 与面板不一致 | 用正确的 WEB_PATH 重新构建部署 |
| 登录后马上掉线 | 从边缘域名和源站域名交替访问，cookie 不共享 | 只用 `EDGE_DOMAIN` 访问 |
| Passkey 失败 | rpId 仍为源站域名 | 面板中将 rpId 改为 `EDGE_DOMAIN` |
| OIDC 回调失败 | 回调地址仍为源站域名 | 在 IdP 和面板中改为 `https://EDGE_DOMAIN${WEB_PATH}api/oidc-callback` |

# 部署后告知用户（需人工操作，不要自动修改面板设置）
1. 面板设置：webDomain 留空或设为源站主机名；passkey rpId 设为 `EDGE_DOMAIN`；OIDC 回调改为 `https://EDGE_DOMAIN${WEB_PATH}api/oidc-callback`。
2. 源站只放行 Cloudflare IP 或改用 Cloudflare Tunnel；若设置了 `ORIGIN_SECRET`，在 nginx 中加入：
   `if ($http_x_nexus_edge_secret != "<secret>") { return 403; }`
3. 免费版每天 10 万次 Worker 调用：一个常开标签页约 8,640 次/天，停留在节点页另加约 17,280 次/天。
4. 之后每次升级面板后端，都要用同版本的前端重新执行“步骤”。

# 回滚
`npx wrangler delete -c .cf/wrangler.jsonc`（删除 Worker 及其自定义域名绑定），用户改回直接访问 `ORIGIN${WEB_PATH}`。面板本身不受影响。

# 禁止事项
- 不要把 `CLOUDFLARE_API_TOKEN`、`ORIGIN_SECRET` 写入仓库或 `wrangler.jsonc` 的 `vars`。
- 不要把 `run_worker_first` 改为 `true`（会让每个静态资源都计入 Worker 调用）。
- 不要修改后端代码来适配此部署。
