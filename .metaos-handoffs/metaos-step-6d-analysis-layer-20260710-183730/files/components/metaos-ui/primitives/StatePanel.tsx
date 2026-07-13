import type {
  ReactNode,
} from "react";

import {
  AlertCircle,
  Database,
  LoaderCircle,
} from "lucide-react";

import { Button } from "@/components/metaos-ui/primitives/Button";

export interface StatePanelProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function StatePanel({
  icon,
  title,
  description,
  action,
}: StatePanelProps) {
  return (
    <section className="mos-state-panel">
      <div
        className="mos-state-panel-icon"
        aria-hidden="true"
      >
        {icon}
      </div>

      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      {action ? (
        <div className="mos-state-panel-action">
          {action}
        </div>
      ) : null}
    </section>
  );
}

export function EmptyState({
  title = "No data available",
  description = "There is no information to display for the current selection.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <StatePanel
      icon={<Database size={18} />}
      title={title}
      description={description}
      action={action}
    />
  );
}

export function LoadingState({
  title = "Loading data",
  description = "MetaOS is preparing this view.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <StatePanel
      icon={
        <LoaderCircle
          size={18}
          className="mos-state-spinner"
        />
      }
      title={title}
      description={description}
    />
  );
}

export function ErrorState({
  title = "Unable to load this view",
  description,
  retry,
}: {
  title?: string;
  description: string;
  retry?: () => void;
}) {
  return (
    <StatePanel
      icon={<AlertCircle size={18} />}
      title={title}
      description={description}
      action={
        retry ? (
          <Button
            variant="danger"
            size="sm"
            onClick={retry}
          >
            Try again
          </Button>
        ) : undefined
      }
    />
  );
}
