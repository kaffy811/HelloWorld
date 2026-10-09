import { ExplanationDetail } from "@/components/explanation-detail";
export default async function NewsExplanation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ExplanationDetail id={id} section="news" />;
}
