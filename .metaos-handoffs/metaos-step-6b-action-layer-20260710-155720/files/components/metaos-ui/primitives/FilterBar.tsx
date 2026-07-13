import type {
  ReactNode,
} from "react";

export interface FilterBarProps {
  children: ReactNode;
  actions?: ReactNode;
  summary?: ReactNode;
}

export function FilterBar({
  children,
  actions,
  summary,
}: FilterBarProps) {
  return (
    <div className="mos-filter-bar">
      <div className="mos-filter-controls">
        {children}
      </div>

      {summary ? (
        <div className="mos-filter-summary">
          {summary}
        </div>
      ) : null}

      {actions ? (
        <div className="mos-filter-actions">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
