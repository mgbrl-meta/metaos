import type { Metadata } from "next";

import "../../styles/metaos-ui/index.css";

export const metadata: Metadata = {
  title: "Workspace",
};

export default function MetaOSWorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
