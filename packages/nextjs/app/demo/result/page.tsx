import { DEMO_PROVIDERS } from "@/app/demo/_data/demo-fixtures";
import { DemoBriefToolbar } from "@/app/demo/_components/demo-brief-toolbar";
import type { LLMProviderName } from "@/types/decision";
import { DemoResultView } from "./demo-result-view";

function parseProvider(value: string | undefined): LLMProviderName {
  if (value && DEMO_PROVIDERS.includes(value as LLMProviderName)) {
    return value as LLMProviderName;
  }
  return "openai";
}

export default async function DemoResultPage({
  searchParams,
}: {
  searchParams: Promise<{ provider?: string }>;
}) {
  const params = await searchParams;
  const provider = parseProvider(params.provider);
  return (
    <>
      <DemoBriefToolbar view="single" provider={provider} />
      <DemoResultView provider={provider} />
    </>
  );
}
