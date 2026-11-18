# 用 Cloudflare Workers 托管面板前端

把面板前端放到 Cloudflare 边缘：静态资源（JS/CSS/字体，约 3 MB）由 Workers Static Assets 在边缘直接返回，只有 API 请求回源到面板。浏览器看到的始终是同一个域名，所以登录 cookie、会话、备份下载都不用改。

```
浏览器 ──> edge.example.com (Worker)
             ├─ /app/assets/*, /app/*  → 边缘静态资源（不计 Worker 调用）
             └─ /app/api*, apiv2*, apiv3* → Worker 转发 → https://panel.example.com
```

## 前提
- 一个托管在 Cloudflare 的域名（中国大陆访问 `*.workers.dev` 通常不稳定，请绑定自定义域名）。
- 面板源站有一个 Worker 能访问的 **域名**（Workers 不能直接请求裸 IP）。推荐用面板自带的「域名与证书 → nginx 反代」把面板挂在 `https://panel.example.com` 的 443 端口。
- 前端版本必须和面板后端版本一致。

## 构建与部署
```bash
npm ci
WEB_PATH=/app/ ORIGIN=https://panel.example.com npm run build:cf
npx wrangler login
npx wrangler deploy -c .cf/wrangler.jsonc
```
- `WEB_PATH`：面板设置里的 Web 路径（默认 `/app/`）。
- `ORIGIN`：源站地址，只写 `scheme://host[:port]`。
- `WORKER_NAME`：Worker 名称，默认 `s-ui-nexus-web`。
然后在 Cloudflare 后台给该 Worker 添加自定义域名（如 `edge.example.com`）。

## 面板端设置
- **Web 域名（webDomain）**：留空，或设为源站域名 `panel.example.com`（Worker 回源时 Host 是源站域名）。不要设成边缘域名。
- **Passkey**：rpId 设为边缘域名 `edge.example.com`。
- **OIDC**：回调地址改为 `https://edge.example.com/app/api/...`（与原路径相同，只换域名）。
- 在面板里修改 Web 域名/端口/路径后，页面会跳到新的源站地址，这是正常的；回到边缘域名即可。

## 安全建议
- 源站只放行 Cloudflare IP，或改用 Cloudflare Tunnel，避免绕过边缘直连。
- 可选共享密钥：`npx wrangler secret put ORIGIN_SECRET -c .cf/wrangler.jsonc`，Worker 会带上 `X-Nexus-Edge-Secret` 头，在 nginx 里校验：
  ```nginx
  if ($http_x_nexus_edge_secret != "你的密钥") { return 403; }
  ```

## 额度
- 免费版每天 10 万次 Worker 调用，静态资源不计。面板每 10 秒轮询一次，一个标签页常开约 8,640 次/天；停留在节点页另加约 17,280 次/天。
- 免费版每次请求 CPU 10 ms，回源等待不计入。

## 能分摊什么
- 分摊：首屏和静态资源流量、带宽，以及海外/跨网访问的加载速度。
- 不分摊：API 请求、节点心跳、订阅（`sub`）仍由面板处理。
