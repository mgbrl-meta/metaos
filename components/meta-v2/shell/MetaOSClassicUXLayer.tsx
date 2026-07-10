"use client";

import { useEffect, useMemo, useState } from "react";

const MENU_ITEMS = [
  "QC",
  "Summary",
  "De-scale",
  "Scale",
  "Influencer",
  "Zero Purchase",
  "High CPA",
  "GPT",
  "Funnel",
  "High ROAS",
  "Spend",
  "Creative",
  "Ageing",
  "Monthly",
];

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function getButtonLabel(button: HTMLButtonElement) {
  return normalize(button.textContent || "");
}

function getOriginalTabButtons() {
  const menuSet = new Set(MENU_ITEMS.map(normalize));

  return Array.from(document.querySelectorAll<HTMLButtonElement>("button")).filter((button) => {
    if (button.closest(".metaos-classic-sidebar")) return false;

    const label = getButtonLabel(button);

    return menuSet.has(label);
  });
}

function markOriginalTopTabs() {
  getOriginalTabButtons().forEach((button) => {
    button.dataset.metaosOriginalTab = "true";
  });
}

function clickOriginalTab(label: string) {
  const normalized = normalize(label);
  const button = getOriginalTabButtons().find((item) => getButtonLabel(item) === normalized);

  if (button) {
    button.click();
    return true;
  }

  return false;
}

function detectActiveLabel() {
  const buttons = getOriginalTabButtons();

  for (const button of buttons) {
    const className = String(button.className || "");
    const isActive =
      className.includes("bg-blue") ||
      className.includes("text-white") ||
      className.includes("active") ||
      button.getAttribute("aria-current") === "page" ||
      button.getAttribute("data-state") === "active";

    if (isActive) {
      const raw = button.textContent || "";
      const match = MENU_ITEMS.find((label) => normalize(label) === normalize(raw));
      if (match) return match;
    }
  }

  return "";
}

export function MetaOSClassicUXLayer() {
  const [collapsed, setCollapsed] = useState(false);
  const [active, setActive] = useState("Summary");

  const menuItems = useMemo(() => MENU_ITEMS, []);

  useEffect(() => {
    const stored = window.localStorage.getItem("metaos-classic-sidebar-collapsed");
    const nextCollapsed = stored === "1";

    setCollapsed(nextCollapsed);
    document.documentElement.dataset.metaosClassicSidebar = nextCollapsed ? "collapsed" : "expanded";
  }, []);

  useEffect(() => {
    document.documentElement.dataset.metaosClassicSidebar = collapsed ? "collapsed" : "expanded";
    window.localStorage.setItem("metaos-classic-sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    markOriginalTopTabs();

    const activeLabel = detectActiveLabel();
    if (activeLabel) setActive(activeLabel);

    const observer = new MutationObserver(() => {
      markOriginalTopTabs();

      const nextActive = detectActiveLabel();
      if (nextActive) setActive(nextActive);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "data-state", "aria-current"],
    });

    return () => observer.disconnect();
  }, []);

  function handleMenuClick(label: string) {
    setActive(label);
    clickOriginalTab(label);
  }

  return (
    <aside className="metaos-classic-sidebar" aria-label="MetaOS navigation">
      <div className="metaos-classic-sidebar-header">
        <div className="metaos-classic-brand-mark">▦</div>

        {!collapsed ? (
          <div className="metaos-classic-brand-copy">
            <div className="metaos-classic-brand-title">Command</div>
            <div className="metaos-classic-brand-subtitle">MetaOS</div>
          </div>
        ) : null}

        <button
          type="button"
          className="metaos-classic-collapse"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? "Expand menu" : "Collapse menu"}
          title={collapsed ? "Expand menu" : "Collapse menu"}
        >
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      <nav className="metaos-classic-menu">
        {menuItems.map((label) => (
          <button
            key={label}
            type="button"
            className={active === label ? "metaos-classic-menu-item is-active" : "metaos-classic-menu-item"}
            onClick={() => handleMenuClick(label)}
            title={label}
          >
            <span className="metaos-classic-menu-icon">□</span>
            {!collapsed ? <span className="metaos-classic-menu-label">{label}</span> : null}
          </button>
        ))}
      </nav>
    </aside>
  );
}
