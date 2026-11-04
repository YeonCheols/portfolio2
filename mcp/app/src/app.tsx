import { lazy, Suspense, type ReactElement } from "react";

import { adminMenuItems, adminMenuPath } from "../../src/auth/adminMenu";

import { parseDetailKey } from "./debug/archive-search";
import { LoginPage } from "./login/login-page";
import { AdminMenuPage } from "./menu/admin-menu-page";
import { AdminLayout } from "./ui/admin-layout";

type AppProps = {
  pathname: string;
  search: string;
};

// 관리 화면은 들어갈 때만 내려받는다. 이름 있는 export를 lazy가 요구하는 default로 맞춘다
const SettingsPage = lazy(() =>
  import("./settings/settings-page").then((module) => ({
    default: module.SettingsPage,
  })),
);
const ArchiveListPage = lazy(() =>
  import("./debug/archive-list-page").then((module) => ({
    default: module.ArchiveListPage,
  })),
);
const ArchiveDetailPage = lazy(() =>
  import("./debug/archive-detail-page").then((module) => ({
    default: module.ArchiveDetailPage,
  })),
);

type PageRenderer = (props: { search: string }) => ReactElement;

// 메뉴 항목 ID → 화면. 경로와 이름은 공통 메뉴 정의가 소유하고 여기는 어떤 화면을 그릴지만 안다.
// 새 화면은 메뉴 정의에 항목을 추가한 뒤 같은 ID로 여기에 등록한다
export const pageRegistry: Record<string, PageRenderer> = {
  "ai-models": () => <SettingsPage />,
  "debug-archive": ({ search }) => {
    const archiveKey = parseDetailKey(search);
    // 실행 키가 URL에 있으면 새로고침해도 같은 상세로 돌아온다
    return archiveKey ? (
      <ArchiveDetailPage archiveKey={archiveKey} />
    ) : (
      <ArchiveListPage search={search} />
    );
  },
};

const connectPath = "/admin/ai-models/connect";

// 화면 코드가 도착하기 전에도 현재 위치는 보이도록 레이아웃은 먼저 그린다
const PageLoading = ({ current }: { current: string }) => (
  <AdminLayout current={current}>
    <p role="status" aria-live="polite" className="text-sm text-slate-600">
      화면을 불러오는 중입니다.
    </p>
  </AdminLayout>
);

const NotFoundPage = () => (
  <AdminLayout current="not-found">
    <h1 className="text-4xl font-bold tracking-tight">
      페이지를 찾을 수 없습니다
    </h1>
    <p className="mt-3 leading-relaxed text-slate-600">
      주소를 확인하거나 위 경로의 메뉴에서 화면을 선택해 주세요.
    </p>
  </AdminLayout>
);

export const App = ({ pathname, search }: AppProps) => {
  const path = pathname.replace(/\/+$/, "");
  if (path === connectPath) {
    const params = new URLSearchParams(search);
    return <LoginPage error={params.get("error")} next={params.get("next")} />;
  }
  if (path === adminMenuPath) return <AdminMenuPage />;
  const item = adminMenuItems.find((entry) => entry.path === path);
  const render = item ? pageRegistry[item.id] : undefined;
  if (!item || !render) return <NotFoundPage />;
  return (
    <Suspense fallback={<PageLoading current={item.id} />}>
      {render({ search })}
    </Suspense>
  );
};
