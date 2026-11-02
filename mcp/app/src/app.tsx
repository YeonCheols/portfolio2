import { LoginPage } from "./login/login-page";
import { SettingsPage } from "./settings/settings-page";

type AppProps = {
  pathname: string;
  search: string;
};

const connectPath = "/admin/ai-models/connect";

export const App = ({ pathname, search }: AppProps) => {
  if (pathname.replace(/\/+$/, "") === connectPath) {
    return <LoginPage error={new URLSearchParams(search).get("error")} />;
  }
  return <SettingsPage />;
};
