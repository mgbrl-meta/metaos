import type { ReactNode } from "react";

export function SectionCard({
  title,
  eyebrow,
  children,
  right,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <section className="rounded-[32px] border border-white/10 bg-white/[0.055] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-xl">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          {eyebrow ? (
            <div className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#0A84FF]">
              {eyebrow}
            </div>
          ) : null}
          <h2 className="text-xl font-black tracking-tight text-white">{title}</h2>
        </div>
        {right}
      </div>

      {children}
    </section>
  );
}
