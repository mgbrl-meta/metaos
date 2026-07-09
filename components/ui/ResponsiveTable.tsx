"use client";

import { ReactNode } from "react";

export function ResponsiveTableShell({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="w-full min-w-0 overflow-hidden rounded-[1.5rem] border border-current/10 bg-current/[0.025]">
      {(title || description) && (
        <div className="border-b border-current/10 px-4 py-4 sm:px-5">
          {title && <h2 className="text-lg font-black sm:text-xl">{title}</h2>}
          {description && (
            <p className="mt-1 text-xs leading-5 opacity-55 sm:text-sm">
              {description}
            </p>
          )}
        </div>
      )}

      <div className="w-full min-w-0 overflow-x-auto">
        {children}
      </div>
    </div>
  );
}

export function ResponsiveTable({
  children,
  minWidth = 920,
}: {
  children: ReactNode;
  minWidth?: number;
}) {
  return (
    <table
      className="w-full table-auto border-collapse text-left text-sm"
      style={{ minWidth }}
    >
      {children}
    </table>
  );
}
