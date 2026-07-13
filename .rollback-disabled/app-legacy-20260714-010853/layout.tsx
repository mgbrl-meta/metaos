import "../globals.css";
import "../os-theme-final.css";
import "../metaos-readability.css";

import { CopyVisibleMetaFilter } from "@/components/meta/CopyVisibleMetaFilter";
import { MetaOSClassicUXLayer } from "@/components/meta-v2/shell/MetaOSClassicUXLayer";

export default function LegacyMetaOSLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex flex-col">
      <CopyVisibleMetaFilter />
      <MetaOSClassicUXLayer />
      {children}
    </div>
  );
}
