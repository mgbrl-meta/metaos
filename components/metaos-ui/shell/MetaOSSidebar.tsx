"use client";

import {
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type {
  MetaOSModuleId,
} from "@/lib/metaos-ui/contracts";

import {
  METAOS_MODULES,
  METAOS_SECTIONS,
} from "@/lib/metaos-ui/moduleRegistry";

import { useMetaOSUiStore } from "@/store/metaOSUiStore";

type ShellModule = {
  id: MetaOSModuleId;
  sectionId: string;
  label: string;
  shortLabel: string;
  description: string;
  order: number;
  keywords: readonly string[];
  icon: LucideIcon;
};

type ShellSection = {
  id: string;
  label: string;
  order: number;
};

const modules =
  METAOS_MODULES as unknown as readonly ShellModule[];

const sections =
  METAOS_SECTIONS as unknown as readonly ShellSection[];

export function MetaOSSidebar() {
  const activeModuleId = useMetaOSUiStore(
    (state) => state.activeModuleId
  );

  const setActiveModule = useMetaOSUiStore(
    (state) => state.setActiveModule
  );

  const collapsed = useMetaOSUiStore(
    (state) => state.sidebarCollapsed
  );

  const search = useMetaOSUiStore(
    (state) => state.navigationSearch
  );

  const normalizedSearch =
    search.trim().toLowerCase();

  const visibleModules = modules.filter(
    (module) => {
      if (!normalizedSearch) return true;

      return [
        module.label,
        module.shortLabel,
        module.description,
        ...module.keywords,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    }
  );

  const visibleSections = sections
    .slice()
    .sort((a, b) => a.order - b.order)
    .filter((section) =>
      visibleModules.some(
        (module) =>
          module.sectionId === section.id
      )
    );

  return (
    <aside
      className="mos-sidebar"
      aria-label="MetaOS modules"
    >
      <div className="mos-sidebar-brand">
        <div className="mos-brand-mark">
          M
        </div>

        <div className="mos-brand-copy">
          <div className="mos-brand-name">
            MetaOS
          </div>

          <div className="mos-brand-context">
            Paid Media System
          </div>
        </div>

        <button
          type="button"
          className="mos-sidebar-toggle"
          aria-label={
            collapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
          }
          title={
            collapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
          }
          onClick={() =>
            useMetaOSUiStore.setState({
              sidebarCollapsed:
                !collapsed,
            })
          }
        >
          {collapsed ? (
            <ChevronRight size={14} />
          ) : (
            <ChevronLeft size={14} />
          )}
        </button>
      </div>

      <div className="mos-sidebar-search">
        <div className="mos-search-field">
          <Search />

          <input
            className="mos-search-input"
            value={search}
            placeholder="Find a module"
            aria-label="Search MetaOS modules"
            onChange={(event) =>
              useMetaOSUiStore.setState({
                navigationSearch:
                  event.target.value,
              })
            }
          />
        </div>
      </div>

      <nav className="mos-sidebar-nav">
        {visibleSections.map((section) => {
          const sectionModules =
            visibleModules
              .filter(
                (module) =>
                  module.sectionId ===
                  section.id
              )
              .slice()
              .sort(
                (a, b) =>
                  a.order - b.order
              );

          return (
            <section
              className="mos-nav-section"
              key={section.id}
            >
              <div className="mos-nav-section-title">
                {section.label}
              </div>

              <div className="mos-nav-list">
                {sectionModules.map(
                  (module) => {
                    const Icon =
                      module.icon;

                    const active =
                      activeModuleId ===
                      module.id;

                    return (
                      <button
                        key={module.id}
                        type="button"
                        className={[
                          "mos-nav-item",
                          active
                            ? "is-active"
                            : "",
                        ].join(" ")}
                        title={
                          collapsed
                            ? module.label
                            : module.description
                        }
                        aria-current={
                          active
                            ? "page"
                            : undefined
                        }
                        onClick={() =>
                          setActiveModule(
                            module.id
                          )
                        }
                      >
                        <Icon className="mos-nav-icon" />

                        <span className="mos-nav-label">
                          {module.shortLabel}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            </section>
          );
        })}
      </nav>
    </aside>
  );
}
