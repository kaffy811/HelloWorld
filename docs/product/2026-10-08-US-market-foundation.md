# Clearstock：美股新手的每日阅读与知识收藏

## 本次定盘

主路径：主页看市场和新闻 → 股票 Overview / News / Financials → 阅读已有新闻 AI 解读 → 收藏术语或句子 → Notebook 复习与回到上下文。新闻解读保留 Emoji 有用/无用评分；登录用户可基于新闻追问，回答和完整 prompt 自动保存。未登录可读公开内容，不能评分、写入收藏或追问。

Learning Card 不再是产品入口。删除上传创建、社区发布和卡片列表界面；旧链接转入 Notebook，历史输出、原图和 prompt 留在私人数据库，不做破坏性删除。Watchlist 只收藏股票，Notebook 只收藏知识，避免两种“收藏”混淆。

本阶段不新增 AI 财报分析、截图解释、论坛、实时推送或交易功能。完成数据基础后，再统一把 AI 模块嵌入股票/财报/新闻页面；每个新生成版本沿用 prompt 存档与 Emoji 评分。明天的作业可以先演示真实新闻解释、登录追问生成、数据库写入、评分和严格 RLS。

## 页面与交互

- Today：顶部 SPY / QQQ / DIA 的 ETF 行情代理栏（明确不是指数点位）；主体官方新闻汇总，All / Markets / Industry / Companies 过滤、搜索；右侧自己的 Watchlist；下方已有 AI 新闻解读和六支美股列表。新闻为完整日期排序，而非以生成时间假装新闻发布时间。
- 股票：公司名、代码、价格、变化、IEX 来源和报价时间、星标。Overview 展示一年日收盘折线和 OHLC/成交量/20日均价、公司介绍、年度财务摘要和最近公告。News 显示该股 SEC 原始公告与已生成解释。Financials 分 Income / Balance sheet / Cash flow；年度、季度、累计期间可选择，缺失不填零；每个数字连到实际 SEC accession。
- 财报首版使用折线图，不声称已有交互 K 线、盘前盘后、全市场成交量、市场预期、PE 或同行估值对比。后续加入 K 线/技术指标时必须延续价格口径和复权方式。
- Notebook：Basics / AI terms / AI sentences 分类、搜索、每页20条；展开定义用于主动回忆；返回原文、移除、最近自己的 AI 追问。静态词库明确为 Learning library；AI 原文收藏明确为 AI explanation。保存内容来自服务器可信内容快照，不能让客户端伪造“AI定义”。
- 已有 AI 详情里每个术语和事实/影响句旁边提供 Save。句子收藏附该版本的 AI 摘要和引用标签；不额外调用模型生成新的句子解释。后续可提供选中任意短句的独立解释，但必须验证原文片段和来源。

## 数据源及成本边界

|用途|来源|首版实现|局限|
|---|---|---|---|
|公司公告和财务|SEC submissions / companyfacts|六家公司，8-K/10-Q/10-K，US GAAP结构化报表|自定义XBRL标签可能缺项；不等于分析师预期；遵守User-Agent和公平访问|
|宏观资讯|Federal Reserve monetary-policy / banking-regulation RSS、BLS latest RSS|官方标题/摘要/日期/原文链接|覆盖范围有限，不声称已有完整媒体新闻聚合|
|价格和历史|Alpaca Basic IEX|Key配置后九个symbol批量snapshot，日bar，明确feed=iex|API免费不代表公共分发许可已解决；上线公开行情前需确认账户/数据分发条款；仅IEX，非全市场|
|Yahoo/yfinance|可选研究工具|未作为线上主数据源|项目说明面向研究教育，Yahoo数据个人用途；不承诺公开站点无限免费可用|
|CNBC/Moomoo|页面结构参考|内容层级/标签/行情表结构|未爬取全文、复用图片或复制其品牌|

不承诺任何“永久免费”。目前已配置的 SEC/Fed/BLS 和免费托管额度内无需购买数据；Alpaca 需自己取得开发者API keys。没有价格时保留明确空状态，禁止编造数字或静默换用不明授权源。

官方资料：
- https://www.sec.gov/search-filings/edgar-application-programming-interfaces
- https://www.federalreserve.gov/feeds/feeds.htm
- https://www.bls.gov/feed/
- https://docs.alpaca.markets/us/docs/about-market-data-api
- https://docs.alpaca.markets/us/reference/stocksnapshots-1
- https://github.com/ranaroussi/yfinance

## 处理与数据流

1. 独立后台任务 sync:data（不需 Gemini）→ 来源白名单、25秒超时、16MB上限、SEC串行间隔600ms。
2. 标准化 SEC：CIK → ticker；安全 accession/document → 原文链接；筛选非未来日期；年度330–380天、季度70–110天、累计150–310天；instant 单独处理；同期间同指标优先最新filing；保留 tag、unit、form、filed、accn。不用Q4=全年减前三季来假造季度。
3. 新闻：来源+原始URL/accession 去重；SEC精确关联股票；宏观RSS不猜股票关联，HTML剥离、不执行XML实体。不从模糊关键词把“Apple”一词自动判为AAPL新闻。
4. Alpaca：snapshot 与 IEX daily history；历史分页最多三页，有截断标志；请求结束时间留20分钟窗口。OHLC校验、去重排序、剔除未来bar；复权日收盘与未复权当前成交分开说明。
5. 特征：5/20交易日收益、20交易日均价、前20日成交量比；覆盖不足或分母0为null。首版不把这些变成买卖建议。数据哈希和 schema_version 留在缓存。
6. Supabase：stock_data 每symbol/类型一个最新缓存；market_articles 原始标题摘要；data_sync_runs 私人后台诊断；knowledge_bookmarks 用户独立收藏。公共事实只读，后台服务器写；所有新增表 RLS；收藏必须真实登录，仅自己读/删，创建由服务器核验来源后写入。
7. 网页只读取数据库缓存，普通浏览不会触发 SEC/Alpaca/AI 请求。来源暂时失败保留上一次成功缓存，UI显示真实更新时间；后台run记录失败，不能把旧数据伪装为刚更新。
8. /api/stocks/AAPL/context 提供紧凑、确定性AI证据包：公司、最新年度/季度/累计/instant财务、日期/来源、行情特征、最近公告、缺失和局限、稳定 evidence_hash。价格不存在时明确禁止价格反应推断。当前缓存不支持历史回测，需要未来按时点归档。
9. 下一阶段：证据包+任务提示 → Gemini结构化输出 → 验证数字与引用 → prompt/run保存 → analysis_versions 保存 → 页面嵌入 → ratings 写入。按evidence_hash+prompt版本+语言复用，登录生成限额、全局上限、失败可诊断。已有新闻生成链路继续可用。

## 上线与后续顺序

当前报价是后台同步后的快照，没有WebSocket实时推送。GitHub工作流每天两次拉取（需要配置Secrets，当前仅文件准备并未启用）。明天先保证手动sync成功、正常登录和收藏、生成与评分演示、生产部署；再做自动同步和行情更新频率。Industry 首版覆盖金融行业官方监管公告；其他行业尚未扩展，不虚构新闻占位。

下一阶段优先：在股票Overview/Financials中使用已有证据包生成结构化解释，支持保存重点和术语，并对每个AI版本评分；接着在原始新闻详情加入共享解释生成队列。用户上传暂缓，日后只接公开财报截图/公开段落且放在当前新闻/财报上下文内，不恢复独立卡片社区。
