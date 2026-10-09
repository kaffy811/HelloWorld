# Google 登录状态同步修复

## 观察

用户反馈第一次 Google 登录后仍显示未登录，第二次才显示登录。正式域名进行退出→Google→返回的完整复现时，一次登录成功；因此未把一个推测写成已确认的唯一根因。

Supabase URL Configuration 当前只有正式域名、localhost:3000 和三条旧部署回调，缺少 127.0.0.1:3100 及新部署回调。请求不匹配时会退回 Site URL；不同域名的 Cookie 不共享，旧浏览器点击登录时才初始化 SDK 的实现，也可能延迟处理返回码与页面状态。

## 修改

- 服务器独占 OAuth code 交换，浏览器关闭 detectSessionInUrl，避免双重交换和迟到的交换。
- 回调使用每请求 Cookie 缓冲，把所有 session 分片与旧 Cookie 删除明确写入最终跳转响应；不会静默吞掉写入异常。回调禁用缓存，验证 user 后才进入已登录页面。
- 如果提供方退回首页并带 code，在首页渲染前送入服务器 /auth/callback。路径固定，不采用外部 next；不跨域复制会话。
- 导航监听 INITIAL_SESSION/SIGNED_IN/SIGNED_OUT，在浏览器与服务器用户状态不一致时刷新页面，一次相同差异只刷新一次，避免每次窗口聚焦都重刷。
- 回调失败只记录阶段、供应商错误码、状态码，不记录 OAuth code、token、Cookie 或用户身份。

## 复现与验证

新增 tests/auth.mjs 使用真实 @supabase/ssr SDK 和隔离提供方 stub：单次 PKCE 交换，较长 Google metadata 产生多个 Cookie 分片，下一请求从最终跳转 Cookie 读到 user；没有第二次 exchange。另检查首页 fallback 固定路径和登录状态刷新去重。

运行 npm test、npm run lint、npm run build。npm run test:http 新增首页 code 路由和回调 no-store 检查，实际部署后用真实 Google 验证一次登录。

## 部署地址白名单

如在本地或提交专属地址登录，需要在 Supabase → Authentication → URL Configuration 添加该地址的 /auth/callback（精确地址）。不添加宽泛通配符。此配置独立于页面代码；新增受信任 OAuth 回调属于认证配置变更，需要用户确认。已部署旧地址不会随新提交更新。

正式域名保持 https://hello-world-gold-eight.vercel.app/auth/callback。
