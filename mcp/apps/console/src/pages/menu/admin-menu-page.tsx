import { adminMenu } from "@portfolio-mcp/admin-contracts";
import { AdminLayout } from "../../shared/ui/admin-layout";

const cardClass =
  "block h-full rounded-2xl border border-slate-200 bg-white p-5";

// 메뉴 구성과 항목 정보는 공통 정의(adminMenu)에서만 가져온다. 화면 이름은 이 파일에 쓰지 않는다
export const AdminMenuPage = () => (
  <AdminLayout>
    <p className="text-xs font-extrabold uppercase tracking-[.14em] text-blue-700">
      MCP 관리자
    </p>
    <h1 className="mb-3 mt-2 text-4xl font-bold tracking-tight">관리 메뉴</h1>
    <p className="leading-relaxed text-slate-600">
      도메인별로 관리 화면을 고릅니다. 준비 중인 항목은 아직 열 수 없습니다.
    </p>
    <div className="mt-8 grid gap-8">
      {adminMenu.map((domain) => (
        <section key={domain.id} aria-label={domain.label}>
          <h2 className="text-sm font-bold text-slate-500">{domain.label}</h2>
          <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {domain.items.map((item) =>
              item.path ? (
                <li key={item.id} className="relative">
                  <div
                    className={`${cardClass} hover:border-blue-300 hover:bg-blue-50/40 has-[:focus-visible]:border-blue-500 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-blue-500/10`}
                  >
                    {/* 링크 이름은 라벨만 두고 설명은 연결하며, 가상 요소로 카드 전체를 클릭 영역으로 만든다 */}
                    <a
                      href={item.path}
                      aria-describedby={`menu-${item.id}-description`}
                      className="font-bold text-slate-900 outline-none after:absolute after:inset-0 after:content-['']"
                    >
                      {item.label}
                    </a>
                    <span
                      id={`menu-${item.id}-description`}
                      className="mt-1 block text-sm text-slate-600"
                    >
                      {item.description}
                    </span>
                  </div>
                </li>
              ) : (
                <li key={item.id} aria-disabled="true">
                  <div className={`${cardClass} bg-slate-50 text-slate-500`}>
                    <span className="flex items-center gap-2 font-bold">
                      {item.label}
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600">
                        준비 중
                      </span>
                    </span>
                    <span className="mt-1 block text-sm">
                      {item.description}
                    </span>
                  </div>
                </li>
              ),
            )}
          </ul>
        </section>
      ))}
    </div>
  </AdminLayout>
);
