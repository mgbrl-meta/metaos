"use client";

import {
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";

import type {
  LucideIcon,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  MetaOSModuleId,
} from "@/lib/metaos-ui/contracts";

import {
  METAOS_MODULES,
  METAOS_SECTIONS,
} from "@/lib/metaos-ui/moduleRegistry";

import {
  useMetaOSUiStore,
} from "@/store/metaOSUiStore";

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

const OPEN_DELAY_MS = 150;
const CLOSE_DELAY_MS = 260;

export function MetaOSSidebar() {
  const [
    previewExpanded,
    setPreviewExpanded,
  ] = useState(false);

  const openTimer =
    useRef<
      ReturnType<typeof setTimeout>
      | null
    >(null);

  const closeTimer =
    useRef<
      ReturnType<typeof setTimeout>
      | null
    >(null);

  const activeModuleId =
    useMetaOSUiStore(
      (state) =>
        state.activeModuleId
    );

  const setActiveModule =
    useMetaOSUiStore(
      (state) =>
        state.setActiveModule
    );

  const collapsed =
    useMetaOSUiStore(
      (state) =>
        state.sidebarCollapsed
    );

  const toggleSidebar =
    useMetaOSUiStore(
      (state) =>
        state.toggleSidebar
    );

  const search =
    useMetaOSUiStore(
      (state) =>
        state.navigationSearch
    );

  const setNavigationSearch =
    useMetaOSUiStore(
      (state) =>
        state.setNavigationSearch
    );

  const clearTimers = () => {
    if (openTimer.current) {
      clearTimeout(
        openTimer.current
      );

      openTimer.current = null;
    }

    if (closeTimer.current) {
      clearTimeout(
        closeTimer.current
      );

      closeTimer.current = null;
    }
  };

  const scheduleOpen = () => {
    if (!collapsed) {
      return;
    }

    if (closeTimer.current) {
      clearTimeout(
        closeTimer.current
      );

      closeTimer.current = null;
    }

    if (previewExpanded) {
      return;
    }

    openTimer.current =
      setTimeout(() => {
        setPreviewExpanded(true);
        openTimer.current = null;
      }, OPEN_DELAY_MS);
  };

  const scheduleClose = () => {
    if (openTimer.current) {
      clearTimeout(
        openTimer.current
      );

      openTimer.current = null;
    }

    closeTimer.current =
      setTimeout(() => {
        setPreviewExpanded(false);
        closeTimer.current = null;
      }, CLOSE_DELAY_MS);
  };

  useEffect(
    () => clearTimers,
    []
  );

  useEffect(() => {
    if (!collapsed) {
      clearTimers();
      setPreviewExpanded(false);
    }
  }, [collapsed]);

  const normalizedSearch =
    search.trim().toLowerCase();

  const visibleModules =
    modules.filter((module) => {
      if (!normalizedSearch) {
        return true;
      }

      return [
        module.label,
        module.shortLabel,
        module.description,
        ...module.keywords,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });

  const visibleSections =
    sections
      .slice()
      .sort(
        (a, b) =>
          a.order - b.order
      )
      .filter((section) =>
        visibleModules.some(
          (module) =>
            module.sectionId ===
            section.id
        )
      );

  const previewActive =
    collapsed &&
    previewExpanded;

  return (
    <aside
      className={[
        "mos-sidebar",
        previewActive
          ? "is-preview-expanded"
          : "",
      ].join(" ")}
      aria-label="MetaOS modules"
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleClose}
      onFocusCapture={scheduleOpen}
      onBlurCapture={(event) => {
        const nextTarget =
          event.relatedTarget;

        if (
          !nextTarget ||
          !event.currentTarget.contains(
            nextTarget as Node
          )
        ) {
          scheduleClose();
        }
      }}
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
              ? "Pin sidebar open"
              : "Collapse sidebar"
          }
          title={
            collapsed
              ? "Pin sidebar open"
              : "Collapse sidebar"
          }
          onClick={() => {
            clearTimers();
            setPreviewExpanded(
              false
            );
            toggleSidebar();
          }}
        >
          {collapsed ? (
            <ChevronRight
              size={14}
            />
          ) : (
            <ChevronLeft
              size={14}
            />
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
              setNavigationSearch(
                event.target.value
              )
            }
          />
        </div>
      </div>

      <nav className="mos-sidebar-nav">
        {visibleSections.map(
          (section) => {
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
                            collapsed &&
                            !previewActive
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
                            {
                              module.shortLabel
                            }
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>
              </section>
            );
          }
        )}
      </nav>
    </aside>
  );
}
