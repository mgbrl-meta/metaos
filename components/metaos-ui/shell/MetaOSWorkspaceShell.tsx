"use client";

import { MetaOSModuleRenderer } from "@/components/metaos-ui/MetaOSModuleRenderer";
import { MetaOSHeader } from "@/components/metaos-ui/shell/MetaOSHeader";
import { MetaOSSidebar } from "@/components/metaos-ui/shell/MetaOSSidebar";

import { useThemeStore } from "@/components/theme/ThemeProvider";
import { useMetaOSUiStore } from "@/store/metaOSUiStore";

export function MetaOSWorkspaceShell() {
  const activeModuleId = useMetaOSUiStore(
    (state) => state.activeModuleId
  );

  const sidebarCollapsed =
    useMetaOSUiStore(
      (state) =>
        state.sidebarCollapsed
    );

  const mobileNavigationOpen =
    useMetaOSUiStore(
      (state) =>
        state.mobileNavigationOpen
    );

  const theme = useThemeStore(
    (state) => state.theme
  );

  return (
    <div
      className={[
        "metaos-workspace",
        "metaos-ui",
        sidebarCollapsed
          ? "is-sidebar-collapsed"
          : "",
        mobileNavigationOpen
          ? "is-mobile-nav-open"
          : "",
      ].join(" ")}
      data-theme={theme}
    >
      {mobileNavigationOpen ? (
        <button
          type="button"
          className="mos-mobile-backdrop"
          aria-label="Close navigation"
          onClick={() =>
            useMetaOSUiStore.setState({
              mobileNavigationOpen:
                false,
            })
          }
        />
      ) : null}

      <MetaOSSidebar />

      <div className="mos-app-column">
        <MetaOSHeader />

        <main className="mos-main">
          <div className="mos-content-frame">
            <MetaOSModuleRenderer
              moduleId={activeModuleId}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
