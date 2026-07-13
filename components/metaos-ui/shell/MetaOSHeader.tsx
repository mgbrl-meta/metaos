"use client";

import {
  Menu,
  Moon,
  Settings,
  Sun,
} from "lucide-react";

import type {
  MetaOSModuleId,
} from "@/lib/metaos-ui/contracts";

import {
  METAOS_MODULES,
} from "@/lib/metaos-ui/moduleRegistry";

import { useThemeStore } from "@/components/theme/ThemeProvider";
import { MetaDataStatus } from "@/components/metaos-ui/data/MetaDataStatus";
import { useMetaOSUiStore } from "@/store/metaOSUiStore";

type HeaderModule = {
  id: MetaOSModuleId;
  label: string;
  description: string;
};

const modules =
  METAOS_MODULES as unknown as readonly HeaderModule[];

export function MetaOSHeader() {
  const activeModuleId = useMetaOSUiStore(
    (state) => state.activeModuleId
  );

  const setActiveModule = useMetaOSUiStore(
    (state) => state.setActiveModule
  );

  const theme = useThemeStore(
    (state) => state.theme
  );

  const toggleTheme = useThemeStore(
    (state) => state.toggleTheme
  );

  const activeModule =
    modules.find(
      (module) =>
        module.id === activeModuleId
    ) || modules[0];

  return (
    <header className="mos-header">
      <div className="mos-header-left">
        <button
          type="button"
          className="mos-icon-button mos-mobile-menu"
          aria-label="Open navigation"
          onClick={() =>
            useMetaOSUiStore.setState({
              mobileNavigationOpen: true,
            })
          }
        >
          <Menu size={15} />
        </button>

        <div className="mos-page-identity">
          <div className="mos-page-title">
            {activeModule?.label ||
              "MetaOS"}
          </div>

          <div className="mos-page-description">
            {activeModule?.description ||
              "Performance marketing operating system"}
          </div>
        </div>
      </div>

      <div className="mos-header-right">
        <MetaDataStatus />

        <button
          type="button"
          className="mos-header-action"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title="Toggle light and dark mode"
        >
          {theme === "dark" ? (
            <Sun />
          ) : (
            <Moon />
          )}

          <span>
            {theme === "dark"
              ? "Light"
              : "Dark"}
          </span>
        </button>

        <button
          type="button"
          className="mos-icon-button"
          aria-label="Open settings"
          title="Settings"
          onClick={() =>
            setActiveModule("settings")
          }
        >
          <Settings size={14} />
        </button>
      </div>
    </header>
  );
}
