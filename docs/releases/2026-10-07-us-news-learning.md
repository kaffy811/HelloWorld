# 美股新闻学习版本交付与上线步骤

本次已完成本地实现与隔离验证。尚未修改生产数据库、配置真实 AI、推送 GitHub 或部署 Vercel。现有生产网站仍运行原提交。

2026-10-08：已只读核实生产 `hello-world-db` 的既有表结构与 RLS，迁移已准备在 SQL Editor，尚未执行。逐步操作见 [配置与真实验收指南](./2026-10-08-guided-setup.md)；增加 `npm run check:setup` 进行不泄露密钥的只读配置检查。

## 已完成

1. 今日资讯、公司概览/新闻、解读详情、自选、学堂、私人学习资料页面。
2. 登录用户评分、负反馈原因、私人追问、文本/截图生成卡片、主动发布和提示下载接口。
3. SEC 公司申报采集、全年财务背景、预生成共享解读、引用验证、失败状态与有界额度。
4. 新增表、RLS、私有 Storage、评分唯一约束、后台专属生成函数、原子发布。
5. 原有 Google 登录、资料/偏好流程保留，增加返回原解读处理。
6. 验证：七项数据/生成场景，十五项隔离 PostgreSQL 权限场景，lint、生产构建与类型检查。
7. 本地生产预览验证：桌面 1280px、手机 390px 无横向溢出；公司概览、公司新闻、学堂和访客自选登录跳转正常。HTTP 检查验证评分、上传、发布和自选接口拒绝访客与跨站请求，私有提示下载拒绝访客，OAuth 返回 Cookie 为 HttpOnly 且不能跳转外站。

本地预览截图：[手机首页](./clearstock-us-mobile.jpg)。启动本地生产服务后，可用 `npm run test:http` 重复接口检查；此脚本只允许 localhost，不会写数据库。

## 第一步：应用迁移

确认使用现有 HelloWorld/Clearstock 的 Supabase 项目，而非独立 HumorProject。把 `supabase/migrations/202610070001_us_news_learning.sql` 在该项目 SQL Editor 执行一次。它依赖现有的三份基础迁移；不要在现有项目重复执行旧迁移。

执行后在 Supabase 检查 public 表的 RLS：companies、profiles、news_items、learning_uploads、generation_runs、analysis_versions、ratings、watchlist。其他线上表若存在，也需要逐表审计；本地检查不能证明线上全部表已覆盖。

## 第二步：配置本地服务

保留 `.env.local` 现有公开连接信息，参考 `.env.example` 添加以下服务端变量：

```
SUPABASE_SECRET_KEY=<现有 Supabase 项目的服务器密钥>
GEMINI_API_KEY=<未付费 Gemini 项目的 API Key>
GEMINI_MODEL=<AI Studio 显示有可用免费额度的模型>
AI_FREE_TIER_ENABLED=true
AI_DAILY_LIMIT=20
SEC_USER_AGENT=Clearstock <真实联系邮箱>
```

不要把这些密钥提交 Git、发到聊天或使用 NEXT_PUBLIC_ 前缀。AI 免费服务不适合个人/敏感资料；目前只接收公开学习材料。API Key 本身不证明账号免费，请核实项目计费状态。

## 第三步：首次生成与运行

在 humor-app 仓库根目录执行：

```sh
npm ci
npm test
npm run test:db
npm run lint
npm run build
node --env-file=.env.local scripts/sync-us-news.mjs
npm run dev
```

同步只处理支持公司的近期 SEC 申报。有些公司可能没有近期申报；空结果是正常情况。403、限流或缺少章节时不得绕过 SEC 访问限制，也不能补造新闻。首轮内容需要人工核对来源、数字、期间和解释。

## 第四步：部署现有 Vercel 项目

目标仓库：kaffy811/HelloWorld；目标项目：humor-project8/hello-world。在 Vercel 的 Production 和需要测试的 Preview 环境配置公开 Supabase 变量，以及 SUPABASE_SECRET_KEY、GEMINI_API_KEY、GEMINI_MODEL、AI_FREE_TIER_ENABLED、AI_DAILY_LIMIT。

APP_ORIGIN 可配置成当前部署的精确 origin；若只配置主域名，它会拒绝其他预览域名的写入。未设置时写接口以请求 Host 校验 Origin。预览部署测试也需要公开 Supabase 连接变量，当前线上配置仅在 Production。

为测试的生产/具体提交部署域名，在 Supabase Auth URL Configuration 配置对应 `/auth/callback`。OAuth 回调路径保持不变，返回页面在登录前通过短期 HttpOnly Cookie 保存；实际登录仍需验证提供方与回调白名单设置。

保留应用登录与 RLS。按作业要求处理 Vercel Deployment Protection 后，用无痕浏览器验证具体部署 URL，而不仅是主域名。记录该部署对应的 Git commit SHA 和唯一部署 URL。

## 第五步：定时同步

仓库工作流 `.github/workflows/us-news.yml` 已加入，每天 13:17、21:17 UTC 运行。它不会自动启用外部账户配置。

GitHub repository secrets：NEXT_PUBLIC_SUPABASE_URL、SUPABASE_SECRET_KEY、GEMINI_API_KEY、SEC_USER_AGENT。
Repository variable：GEMINI_MODEL。

先手动运行 workflow_dispatch，再查看任务结果。全局默认每日二十次生成包括用户上传、追问、后台和失败尝试；确保 Vercel 与工作流的额度设定一致。GitHub 定时任务会延迟，长时间没有仓库活动可能暂停。

## 尚待实际验证

真实数据库迁移、Gemini 生成、SEC 网络读取、Google OAuth 返回、Storage 上传、不同用户评分与私有数据隔离、具体部署 URL 的无痕访问。

未来改进：完整公告附件提取、跨公司行业关联、宏观来源、质量审核工具、上传原文件的保留/删除策略与操作监控。当前没有行情授权或实时价格。
