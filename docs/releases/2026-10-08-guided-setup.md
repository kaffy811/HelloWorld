# Clearstock 美股版：逐步配置与真实验收

**后续状态更新：生产迁移和服务端配置现已通过检查，请跳过第 1–3 步，不要重复执行迁移。** 用户日常开发目录为 `/Users/kaffy/IdeaProjects/hello-world`，新功能已同步到该目录并保留原 `.env.local`。后续命令应先进入该目录。

## 当前已核实的状态

2026-10-08 在已登录的 Supabase Studio 执行了只读结构查询：目标项目为 `hello-world-db`，public 仅有 `companies` 和 `profiles`，两张表的 RLS 均为 true；profiles 的已有偏好与 onboarding 字段符合本地基础迁移。没有读取用户行，也没有执行生产迁移。

本地目录名 `humor-app` 和 Vercel 团队名 `humor-project8` 是历史名称，并不代表需要另一个 Supabase 项目。继续使用当前数据库。

本次增补的配置检查已在缺少密钥的实际本地环境验证，能明确列出待填写项；数据库隔离测试增加重复迁移防护验证，共十六项通过，lint 通过。真实生产迁移、模型调用和用户完整流程仍待下列步骤完成。

## 1. 执行新闻功能迁移

Supabase Studio 的 SQL Editor 已放入本地 `supabase/migrations/202610070001_us_news_learning.sql` 的完整内容，尚未点击 Run。

1. 顶部确认 `hello-world-db` / `main` / `PRODUCTION`。
2. 点击代码区，按 Command+A 全选整份 SQL，点击右上角 Run。
3. 成功时会显示类似 `Success. No rows returned`。不要重复运行旧迁移或本迁移。
4. 回到 Table Editor 并刷新，应出现原来两张表及六张新表：news_items、learning_uploads、generation_runs、analysis_versions、ratings、watchlist。
5. Storage 应出现私有 bucket `learning-materials`，限制 2 MB 的 JPG/PNG/WebP。

迁移在事务中执行，包含重复运行检查，不删除原有资料。若有错误，保留错误文本供排查，不要自行删除表重新开始。

可以在新的 SQL query 执行这个只读检查，预期八张 public 表的 rls_enabled 都为 true：

```sql
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r'
order by c.relname;
```

## 2. 填 Supabase 服务端密钥

打开当前项目的 Settings → API Keys。复制已有 Secret key（通常以 `sb_secret_` 开头）。若只有旧版 keys，本实现也接受 legacy `service_role` key，填到同一个变量。不要复制 publishable / anon key 代替服务端 key。

在本地 `.env.local` 找到并填写 `SUPABASE_SECRET_KEY=`。已有的 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 已配置，应保留。密钥不要贴聊天、SQL Editor、README 或 GitHub 普通变量；服务端密钥可以绕过 RLS，因此只能由后台保存和使用。[Supabase 官方说明](https://supabase.com/docs/guides/getting-started/api-keys)

## 3. 配置 Gemini 免费项目

1. 打开 [Google AI Studio](https://aistudio.google.com/) 并使用自己的 Google 账号登录。
2. 在 Dashboard 的 Projects / API Keys 中选择自己控制的项目，创建该项目的 API key。如出现服务条款，请自己阅读并决定是否接受。
3. 查看该项目的计费状态和 Rate limits；使用未启用付费计费、所选模型确有免费额度的项目。不要仅凭“AI Studio 免费”判断 API 免费。
4. 可优先检查 `gemini-3.5-flash-lite`：目前官方价目表列出其文本/图片标准请求免费档；最终以你项目中的可用模型和额度为准。若不可用，记录模型 ID 与非敏感错误，改用项目允许的 Flash 模型。
5. 把 key 填到 `.env.local` 的 GEMINI_API_KEY；把模型 ID 填到 GEMINI_MODEL，不要带 `models/` 前缀。

确认免费档后，本地新增项应类似：

```dotenv
SUPABASE_SECRET_KEY=填入你的服务端密钥
GEMINI_API_KEY=填入你的Gemini密钥
GEMINI_MODEL=gemini-3.5-flash-lite
AI_FREE_TIER_ENABLED=true
AI_DAILY_LIMIT=20
SEC_USER_AGENT="Clearstock 你的真实联系邮箱"
```

以上中文是填写提示，不是真实值。每日应用上限不得大于你项目的免费额度；20 是初始应用限制，不是 Google 的额度保证。若免费每日请求数更少，应降低本地、Vercel 与 GitHub 工作流三个地方的上限。

免费服务可能使用输入/输出改进产品，因此当前上传只支持公开材料。[Gemini 价格](https://ai.google.dev/gemini-api/docs/pricing)、[API Keys](https://ai.google.dev/gemini-api/docs/api-key)、[项目限额](https://ai.google.dev/gemini-api/docs/rate-limits)

## 4. 配置检查、首批生成和本地联调

前面完成后，在本地仓库根目录运行：

```sh
cd /Users/kaffy/IdeaProjects/hello-world
npm run check:setup
node --env-file=.env.local scripts/sync-us-news.mjs
npm run build
npm run start -- --hostname 127.0.0.1 --port 3100
```

命令逐行执行，不要在末尾添加反斜线。若当前任务已经启动了 3100 预览，直接打开 http://127.0.0.1:3100 即可，不要重复启动。若准备自己运行开发模式，应先停止当前预览，或使用 `npm run dev -- --port 3101`；新端口的 OAuth callback 需要在 Supabase 配置。

首次小批量验证可执行 `node --env-file=.env.local scripts/sync-us-news.mjs --ticker=COST --limit=1`。不传 ticker 检查所有支持公司，limit 约束本轮最大尝试数（1–12），不是改变全局每日上限。没有近期申报的公司不会触发模型调用。

也可以回复“迁移和配置已完成”，由当前任务执行这些步骤、核查真实结果并修复。配置检查只报告通过/缺失，不打印密钥；它检查模型元信息，不生成文本，不修改数据库，也不能证明实际免费额度。首次同步才会调用模型与插入新闻/解读行。

同步统计的 saved 大于零后，检查今日资讯和对应公司页是否出现同一解读。若没有近期 SEC 申报，空结果正常；若遇到 403/429，不绕过访问限制，也不编造内容。

使用公开公司资料进行以下验收：

| 操作                                   | 预期结果                                                  |
| -------------------------------------- | --------------------------------------------------------- |
| 不登录浏览首页、公司与解读             | 可阅读公开内容；来源与日期可见                            |
| 不登录点击评分、关注或进入 My learning | 提示登录，登录后返回原页面                                |
| 登录后对一个版本评分                   | ratings 新增一行，绑定本人和该解读；重复评分不能再插入    |
| 上传简短公开文字，选择中文             | 生成中文私人学习卡片；generation_runs 保存提示与状态      |
| 上传小于 2 MB 的公开截图               | 原图转换后存于私有 bucket；解读保存并声明截图信息尚未核实 |
| 在一篇解读下继续追问                   | 新增私人 followup，保留源证据与原内容关联                 |
| 用第二个账号访问第一人的私人卡片/提示  | 无法读取                                                  |
| 原作者主动发布公开材料卡片             | 卡片可在社区学习被阅读；原文件与生成提示仍私有            |
| 查看 AI 文本                           | 引用、数字、财务期间与原文一致；不捏造行情或给交易指令    |

如果本地 Google 登录拒绝回调，在 Supabase Authentication → URL Configuration 保留现有 Site URL，并把 `http://127.0.0.1:3100/auth/callback` 加入 Redirect URLs。不要关闭应用身份验证。

## 5. 发布到当前 Vercel 项目

真实联调通过后，提交并推送本次代码到 `kaffy811/HelloWorld`，让现有 Vercel 项目 `hello-world` 构建。不要重新创建网站或数据库。

Vercel → hello-world → Settings → Environment Variables，在 Production 和 Preview 都配置：NEXT_PUBLIC_SUPABASE_URL、NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY、SUPABASE_SECRET_KEY、GEMINI_API_KEY、GEMINI_MODEL、AI_FREE_TIER_ENABLED、AI_DAILY_LIMIT。按前述使用安全的环境变量保存方式。每次改变量后，需要新部署或 Redeploy 才会应用。

APP_ORIGIN 先留空，让接口按各自部署 Host 验证来源；若写死主域名，具体提交的预览域名将无法写入。部署的主域名和需要验证的具体部署域名，应在 Supabase Redirect URLs 中分别加入对应 `/auth/callback`。

最终验收：无痕窗口能打开公开页面、Google 登录能返回原解读、评分/上传/追问成功、第二用户不能读取私人资料。作业提交应使用已验收的唯一部署 URL，并记录该部署的 commit SHA。

Vercel Deployment Protection 与应用 Google 登录/RLS 是两套机制。若平台保护阻挡公开作业验收，在项目设置中处理该保护；保留应用登录和数据库规则。该设置调整另行核实后操作。

## 6. 启用每天同步

GitHub 仓库 → Settings → Secrets and variables → Actions。添加 repository secrets：NEXT_PUBLIC_SUPABASE_URL、SUPABASE_SECRET_KEY、GEMINI_API_KEY、SEC_USER_AGENT；添加 repository variable：GEMINI_MODEL。

工作流 `.github/workflows/us-news.yml` 已设置每天 13:17 和 21:17 UTC。额度如有调整，必须同步修改工作流的 AI_DAILY_LIMIT。先在 Actions → US company explanations → Run workflow 手动运行并检查结果，然后再观察定时运行。

## 达到可体验的边界

当前目标是可阅读真实来源解读、可评分、可创建内容并私人追问的美股学习应用。首版资讯来源是官方 SEC 申报；它不是覆盖所有突发新闻的行业新闻终端。实时股价与广泛行业资讯，需要另行确认授权与免费额度后接入，不能为了填满界面使用未经核实或无展示许可的数据。
