# 2026-10-08 美股页面与数据基础落地

## 已完成

- 删除 Learning Card 上传/创建/社区分享入口。`/materials` 与历史 material 详情转到 `/notebook`；历史数据库数据和文件保留。`/api/learning` 仅接受可访问 news/followup 的上下文追问；`/api/publish` 已登录也返回410。
- Today 顶部行情代理栏、分类新闻/行业官方资讯、搜索、Watchlist摘要和股票数据表；独立 `/news` 页分页。
- 六家公司 Overview / News / Financials；真实 IEX报价、复权日收盘图、OHLC/成交量/均价；SEC三张财务报表、年度/季度/累计选择、原始申报链接。
- Notebook 保存术语/句子/基础词库定义，搜索、分类、20条分页、展开讲解、返回原文和移除；收藏快照来自可信内容，客户端不能自行伪造AI解释。
- 现有真实 SEC AI 新闻解读、Emoji有用/无用评分、登录追问、prompt下载保留。尚未新增股票/财报AI模块。
- 生产 Supabase `hello-world-db` 已运行 `202610080001_market_foundation.sql`，新增 stock_data / market_articles / data_sync_runs / knowledge_bookmarks；均启用RLS。
- 数据同步成功：六家公司财报缓存、293条申报记录、103条官方资讯、九个 IEX股票/ETF报价。没有使用测试价格或虚构新闻。
- 数据同步不依赖Gemini；规范化期间/单位/日期/来源、同期间最新filing、OHLC校验、剔除未完成的当日bar、缺失特征null；后续AI证据包API已准备。

## 配置与日常刷新

实际开发目录 `/Users/kaffy/IdeaProjects/hello-world`，本地 `http://127.0.0.1:3100/`。新版本已构建并以独立后台进程运行；不要再启动第二个3100服务。

本地配置已经确认：Supabase公开和服务端key、Gemini模型与key、SEC_USER_AGENT、Alpaca API Key ID/Secret。不要把真实值贴到文档或聊天。

```env
# 以下是字段名说明；不是实际值。
ALPACA_API_KEY_ID=你的Key ID
ALPACA_API_SECRET_KEY=你的Secret
```

这两个变量只在后台读取，不使用 NEXT_PUBLIC_ 前缀。接入仅调用 `data.alpaca.markets` 的行情API，没有交易接口。

需要刷新全部资料时：

```bash
npm run sync:data
```

只刷新九个报价与日线：

```bash
npm run sync:data -- --prices-only
```

若来源失败，任务保留旧缓存，记录partial/failed和来源错误，不把旧数据标为新数据。网页不会随浏览触发抓取。

## 验证与体验路径

1. 打开 Today：价格栏有SPY/QQQ/DIA，新闻按真实发布日期排序；Industry有银行业监管官方公告。
2. 打开 AAPL：Overview 价格与图表；Financials选Quarterly → 对应日期自动切换 → View，年度与季度数值分别展示。缺失季度现金流留空，Year to date可查累计值。
3. 新闻解释中保存一个术语和一个句子 → Notebook → 展开讲解 → 刷新 → 返回原文 → 移除；已真实验证并清理这些验证收藏。
4. 股票星标 → Watchlist和Today显示该股票及价格 → 移除。星标保存已实际验证；结束前恢复验证前状态。
5. 原有新闻详情保留Emoji评分和Ask AI。评分写入/防冒名/防重复/私有内容权限与生成原子保存由数据库测试覆盖；本次阶段没有为测试消耗新的Gemini生成额度。

构建、Lint、17个数据/AI单元测试加onboarding、18个PostgreSQL/RLS场景、HTTP页面和未登录写入保护检查通过。新增版本完整真实AI生成与新股票/财报AI嵌入留到下一阶段；不能把现有单元检查宣称为新的AI端到端生成已完成。

## 尚未上线的事项

- 新前端未推送/部署到 Vercel。当前 Vercel网站仍是此前版本。
- Vercel需要单独配置现有服务端密钥、Gemini开关/模型、站点origin及Supabase OAuth回调；不要上传 `.env.local`。Alpaca抓取在后台任务里，网页读取Supabase缓存。
- `.github/workflows/market-data.yml` 准备了工作日每天两次同步；需要推送并配置 GitHub Actions secrets：NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY / SEC_USER_AGENT / ALPACA_API_KEY_ID / ALPACA_API_SECRET_KEY。目前尚未启用。
- 自动刷新没有启用前，页面展示最后一次同步快照。不是连续实时行情；免费IEX覆盖单一交易所。公开分发需确认账户适用条款。
- 明天提交前应完成生产部署、隐身登录/浏览/投票验证，并提交具体部署对应的commit URL。
