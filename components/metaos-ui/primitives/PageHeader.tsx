import type {
  ReactNode,
} from "react";

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  meta?: ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
}: PageHeaderProps) {
  return (
    <header className="mos-page-header">
      <div className="mos-page-header-copy">
        {eyebrow ? (
          <div className="mos-label">
            {eyebrow}
          </div>
        ) : null}

        <h1 className="mos-page-header-title">
          {title}
        </h1>

        {description ? (
          <p className="mos-page-header-description">
            {description}
          </p>
        ) : null}

        {meta ? (
          <div className="mos-page-header-meta">
            {meta}
          </div>
        ) : null}
      </div>

      {actions ? (
        <div className="mos-page-header-actions">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
