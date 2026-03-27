import { MENU_APPS, MENU_ITEMS } from "@/shared/config/menu";

import Breakline from "@/shared/ui/Breakline";
import Menu from "./Menu";

const Navigation = () => {
  const filteredMenu = MENU_ITEMS?.filter((item) => item?.isShow);
  const filteredAppsMenu = MENU_APPS?.filter((item) => item?.isShow);

  return (
    <>
      <Menu list={filteredMenu} />
      <Breakline className="mx-1" />
      <div className="space-y-1">
        <div className="px-4">
          <span className="text-sm text-neutral-600">Apps</span>
        </div>
        <Menu list={filteredAppsMenu} />
      </div>
    </>
  );
};

export default Navigation;
