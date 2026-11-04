import type { ReactNode } from "react";

import {
  adminMenu,
  adminMenuPath,
  type AdminMenuItem,
} from "../../../src/auth/adminMenu";

type AdminLayoutProps = {
  // 현재 화면의 메뉴 항목 ID. 메뉴 화면에서는 비운다
  current?: string;
  children: ReactNode;
};

// 같은 도메인의 화면만 상단에 나열하고 나머지는 메뉴 화면에서 고른다. 항목 정보는 공통 정의가 소유한다
const siblingsOf = (current?: string): readonly AdminMenuItem[] =>
  (
    adminMenu.find((domain) => domain.items.some((item) => item.id === current))
      ?.items ?? []
  ).filter((item) => item.path);

const linkClass = (active: boolean) =>
  active
    ? "rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700"
    : "rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100";

export const AdminLayout = ({ current, children }: AdminLayoutProps) => (
  <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
    <header className="mx-auto flex h-[72px] w-[calc(100%-32px)] max-w-5xl items-center justify-between border-b border-slate-200">
      <a
        href={adminMenuPath}
        className="flex items-center gap-3 text-sm font-bold tracking-tight"
      >
        <span className="grid size-[34px] place-items-center rounded-xl bg-blue-600 text-white">
          P
        </span>
        <span>PORTFOLIO MCP</span>
      </a>
      <nav aria-label="관리 메뉴" className="flex items-center gap-2">
        <a
          href={adminMenuPath}
          aria-current={current === undefined ? "page" : undefined}
          className={linkClass(current === undefined)}
        >
          메뉴
        </a>
        {siblingsOf(current).map((item) => (
          <a
            key={item.id}
            href={item.path}
            aria-current={item.id === current ? "page" : undefined}
            className={linkClass(item.id === current)}
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
