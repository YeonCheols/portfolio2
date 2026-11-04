import { ArchiveDetailPage } from "./debug/archive-detail-page";
import { ArchiveListPage } from "./debug/archive-list-page";
import { debugPagePath, parseDetailKey } from "./debug/archive-search";
import { LoginPage } from "./login/login-page";
import { SettingsPage } from "./settings/settings-page";

type AppProps = {
  pathname: string;
  search: string;
};

const connectPath = "/admin/ai-models/connect";

export const App = ({ pathname, search }: AppProps) => {
  const path = pathname.replace(/\/+$/, "");
  if (path === connectPath) {
    return <LoginPage error={new URLSearchParams(search).get("error")} />;
  }
  if (path === debugPagePath) {
    const archiveKey = parseDetailKey(search);
    // 실행 키가 URL에 있으면 새로고침해도 같은 상세로 돌아온다
    return archiveKey ? (
      <ArchiveDetailPage archiveKey={archiveKey} />
    ) : (
      <ArchiveListPage search={search} />
    );
  }
  return <SettingsPage />;
};
