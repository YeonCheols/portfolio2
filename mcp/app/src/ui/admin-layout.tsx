import type { ReactNode } from "react";

type AdminLayoutProps = {
  current: "settings" | "debug";
  children: ReactNode;
};

const navItems = [
  { id: "settings", label: "AI 모델 설정", href: "/admin/ai-models" },
  { id: "debug", label: "디버깅 아카이브", href: "/admin/debug/resume" },
] as const;

export const AdminLayout = ({ current, children }: AdminLayoutProps) => (
  <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
    <header className="mx-auto flex h-[72px] w-[calc(100%-32px)] max-w-5xl items-center justify-between border-b border-slate-200">
      <div className="flex items-center gap-3 text-sm font-bold tracking-tight">
        <span className="grid size-[34px] place-items-center rounded-xl bg-blue-600 text-white">
          P
        </span>
        <span>PORTFOLIO MCP</span>
      </div>
      <nav aria-label="관리 메뉴" className="flex items-center gap-2">
        {navItems.map((item) => (
          <a
            key={item.id}
            href={item.href}
            aria-current={item.id === current ? "page" : undefined}
            className={
              item.id === current
                ? "rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700"
                : "rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
            }
          >
            {item.label}
          </a>
        ))}
        <form action="/admin/ai-models/logout" method="post">
          <button
            type="submit"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600"
          >
            로그아웃
          </button>
        </form>
      </nav>
    </header>
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-0 sm:py-14">
      {children}
    </main>
  </div>
);
