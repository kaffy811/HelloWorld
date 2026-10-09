import { ExplanationDetail } from "@/components/explanation-detail";
export default async function NewsExplanation({ params,searchParams }: { params: Promise<{ id: string }>;searchParams:Promise<{from?:string}> }) {
 const {id}=await params;return <ExplanationDetail id={id} section="news" returnPath={(await searchParams).from}/>;
}
