import type { ReactNode } from "react";

import { adminMenu, adminMenuPath } from "@portfolio-mcp/admin-contracts";

import { NavigationProgress } from "./navigation-progress";

type AdminLayoutProps = {
  // 현재 화면의 메뉴 항목 ID. 메뉴 화면에서는 비우고, 메뉴에 없는 화면이면 메뉴 링크만 보여준다
  current?: string;
  // 입력과 결과를 나란히 두는 화면처럼 넓은 작업 영역이 필요할 때 쓴다
  wide?: boolean;
  children: ReactNode;
};

const crumbLinkClass =
  "font-bold text-blue-700 underline-offset-2 hover:underline";

// 위치 표시는 메뉴 정의의 도메인과 항목 이름만 쓴다. 화면 이동은 메뉴 화면에서 한다
const Breadcrumb = ({
  current,
  maxWidth,
}: {
  current?: string;
  maxWidth: string;
}) => {
  const domain = adminMenu.find((entry) =>
    entry.items.some((item) => item.id === current),
  );
  const item = domain?.items.find((entry) => entry.id === current);
  return (
    <nav
      aria-label="현재 위치"
      className={`mx-auto mt-4 w-[calc(100%-32px)] ${maxWidth} text-xs text-slate-500`}
    >
      <ol className="flex flex-wrap items-center gap-2">
        {current === undefined ? (
          <li>
            <span aria-current="page" className="font-bold text-slate-700">
              메뉴
            </span>
          </li>
        ) : (
          <li>
            <a href={adminMenuPath} className={crumbLinkClass}>
              메뉴
            </a>
          </li>
        )}
        {domain && item && (
          <>
            <li aria-hidden="true">›</li>
            <li>{domain.label}</li>
            <li aria-hidden="true">›</li>
            <li>
              <span aria-current="page" className="font-bold text-slate-700">
                {item.label}
              </span>
            </li>
          </>
        )}
      </ol>
    </nav>
  );
};

export const AdminLayout = ({ current, wide, children }: AdminLayoutProps) => {
  const maxWidth = wide ? "max-w-7xl" : "max-w-5xl";
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <NavigationProgress />
      <header
        className={`mx-auto flex h-[72px] w-[calc(100%-32px)] ${maxWidth} items-center justify-between border-b border-slate-200`}
      >
        <a
          href={adminMenuPath}
          className="flex items-center gap-3 text-sm font-bold tracking-tight"
        >
          <span className="grid size-[34px] place-items-center rounded-xl bg-blue-600 text-white">
            P
          </span>
          <span>PORTFOLIO MCP</span>
        </a>
        <form action="/admin/ai-models/logout" method="post">
          <button
            type="submit"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600"
          >
            로그아웃
          </button>
        </form>
      </header>
      <Breadcrumb current={current} maxWidth={maxWidth} />
      <main
        className={`page-in mx-auto ${maxWidth} px-4 py-12 sm:px-0 sm:py-14`}
      >
        {children}
      </main>
    </div>
  );
};
