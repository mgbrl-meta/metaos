import { MetaOSV2App } from "@/components/meta-v2/shell/MetaOSV2App";
import { MetaOSV2TopSheetStatus } from "@/components/meta-v2/shell/MetaOSV2TopSheetStatus";
import { MetaOSV2TopDataControls } from "@/components/meta-v2/shell/MetaOSV2TopDataControls";

export default function MetaOSV2Page() {
  return (
    <>
      <MetaOSV2TopDataControls />
      <MetaOSV2TopSheetStatus />
      <MetaOSV2App />
    </>
  );
}
