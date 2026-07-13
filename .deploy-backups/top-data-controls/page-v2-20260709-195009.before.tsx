import { MetaOSV2App } from "@/components/meta-v2/shell/MetaOSV2App";
import { MetaOSV2RefreshButton } from "@/components/meta-v2/shell/MetaOSV2RefreshButton";

export default function MetaOSV2Page() {
  return (
    <>
      <MetaOSV2RefreshButton />
      <MetaOSV2App />
    </>
  );
}
