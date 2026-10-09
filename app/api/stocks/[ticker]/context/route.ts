import { companies } from "@/lib/news/data";
import { marketData, articles } from "@/lib/market/data";
import { analysisContext } from "@/lib/market/context.mjs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const ticker = (await params).ticker.toUpperCase();
  if (!/^[A-Z.]{1,12}$/.test(ticker))
    return Response.json({ error: "Invalid ticker" }, { status: 400 });
  const [directory, data, feed] = await Promise.all([
    companies(),
    marketData(),
    articles(ticker),
  ]);
  const company = directory.data.find((c) => c.ticker === ticker);
  if (directory.error || data.error || feed.error)
    return Response.json(
      { error: "Evidence data is temporarily unavailable." },
      { status: 503 },
    );
  if (!company)
    return Response.json({ error: "Company unavailable" }, { status: 404 });
  return Response.json(analysisContext(company, data.data, feed.data), {
    headers: { "Cache-Control": "public, max-age=60" },
  });
}
