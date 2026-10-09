# Vercel 上线与 AI 额度、费用记录

## 本次配置

现有项目：Vercel `humor-project8/hello-world`，Supabase `hello-world-db`。保留既有生成内容、提示词、评分与私人 Notebook。

生产使用 Gemini `gemini-3.5-flash-lite` 的标准接口。服务端变量：

```dotenv
AI_ENABLED=true
AI_BILLING_MODE=paid
AI_DAILY_LIMIT=200
AI_USER_DAILY_LIMIT=50
AI_REQUESTS_PER_MINUTE=5
AI_DAILY_BUDGET_USD=0.25
AI_TOTAL_BUDGET_USD=4.5
```

全站和个人额度统计所有生成尝试，包括失败。每日在 `America/Los_Angeles` 午夜重置；个人每日五篇 Learn 是一次请求，不是五次。相同版本已生成的解释不消耗新的请求次数或生成费用；收藏与评分不调用模型。

`AI_TOTAL_BUDGET_USD` 是从新费用记录启用起累计的应用估算上限，不是 Google 的充值或剩余余额。Google 账户其他项目、安装前的请求、账户计费延迟不在这份记录中。保留 $0.50 的余量也不能保证实际账单绝对不超过充值额。Google 余额和账单仍以 AI Studio 为准。

## 以后如何调整

1. 打开 Vercel → hello-world → Settings → Environment Variables。
2. 在 Production 修改 `AI_DAILY_LIMIT`（全站）、`AI_USER_DAILY_LIMIT`（每人）。范围 1–10000，超过供应商实际配额仍会受到供应商限制。
3. 修改 `AI_DAILY_BUDGET_USD`（每日 USD）与 `AI_TOTAL_BUDGET_USD`（累计 USD）。额度提高后，预算仍可能先用完；不要只改次数。
4. 保存后重新部署。Vercel 环境变量修改只影响新部署：https://vercel.com/docs/environment-variables。
5. 本地开发在 `.env.local` 修改相同字段，重启服务。不要上传 `.env.local` 到 GitHub。

把 `AI_ENABLED=false` 可以停止新生成；保存内容仍保留。旧 `AI_FREE_TIER_ENABLED` 仅作兼容开关，不能控制 Google 是否收费。`AI_BILLING_MODE=free` 只能在已经确认供应商项目确实是 Free Tier 时使用，它也不能改变 Google 的账单。

## 费用记录与查看

新增一次性迁移：`supabase/migrations/202610080007_ai_metering.sql`。先完成 001–006，再执行 007 一次；不要重新执行已安装的历史迁移。

新表 `ai_usage_ledger` 通过 `run_id` 关联原 `generation_runs`；原记录继续保存提示词与生成结果。账本保存模型、价格版本、价格快照、输入/缓存/输出/思考 tokens、HTTP 状态、预留金额和估算金额。

账本已启用 RLS，只允许服务端访问。普通用户与匿名用户不能读取全站费用或伪造费用。

在项目目录运行：

```bash
npm run report:ai
```

该命令只读，按 Pacific 日期输出每日次数、tokens、估算金额与尚未核实的预留金额，不输出用户身份、聊天内容、图片或密钥。

也可在 Supabase SQL Editor 查看聚合：

```sql
select (created_at at time zone 'America/Los_Angeles')::date as day,
       count(*) as requests,
       sum(coalesce(estimated_cost_usd,0)) as estimated_usd,
       sum(case when estimated_cost_usd is null then reserved_cost_usd else 0 end) as held_usd,
       count(*) filter (where state in ('reserved','unknown')) as unresolved
from public.ai_usage_ledger
group by 1 order by 1 desc;
```

预留与配额在一个数据库事务中检查，跨 Vercel 实例共享同一预算。请求完成后先记录实际用量，再验证回答；即使回答未通过验证，消耗仍保留。网络超时或用量缺失记为 unknown 并保留预算，不把未知费用伪装成零。明确未发送或供应商明确拒绝的请求释放预留。崩溃留下的预留保守保留，需要对照供应商账单后人工核实。

估算公式：`(输入−缓存)×输入单价 + 缓存×缓存单价 + (输出＋思考)×输出单价`，均除以一百万；总 tokens 的剩余量用于补足供应商可能缺失的思考字段。图片计入供应商输入 tokens。新请求先按文字字节数、图片余量及最大输出做保守预留，仍是估算，并非供应商硬性费用上限。

当前价格快照：输入 $0.30/M，缓存输入 $0.03/M，输出含思考 $2.50/M。来源：https://ai.google.dev/gemini-api/docs/pricing#gemini-3.5-flash-lite。仅支持当前标准生成，不含联网工具、显式缓存存储或其他产品费用；目前没有开启这些功能。

更换模型必须配置匹配 `AI_PRICE_MODEL`、`AI_PRICE_VERSION` 和 `AI_INPUT_USD_PER_MILLION`、`AI_CACHED_USD_PER_MILLION`、`AI_OUTPUT_USD_PER_MILLION`，并核对官网价格，避免沿用错误单价。历史每次请求的价格快照不修改。

## 验证与交付

本地测试包含独立额度、超过 20 次、缓存复用、思考费用、未知费用保留、预算拦截、服务端权限和 RLS。完整上线结果与提交 URL 在部署后另存交付记录。

新闻自动工作流尚未配置 GitHub Actions secrets；当前登录用户使用 News → Update news 手动获取最新官方资讯。市场页面可见时仍使用共享 IEX 轮询。Vercel 部署不会自动执行数据库迁移或替你向 Google 充值。
