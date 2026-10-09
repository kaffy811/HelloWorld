import { ExplanationDetail } from "@/components/explanation-detail";
export default async function LearningCard({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return <ExplanationDetail id={id} section="learning" saved={query.saved === "1"} />;
}
