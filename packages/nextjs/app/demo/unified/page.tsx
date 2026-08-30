import { DemoBriefToolbar } from "@/app/demo/_components/demo-brief-toolbar";
import { DemoUnifiedContent } from "./demo-unified-content";

export default function DemoUnifiedPage() {
  return (
    <>
      <DemoBriefToolbar view="unified" />
      <DemoUnifiedContent />
    </>
  );
}
