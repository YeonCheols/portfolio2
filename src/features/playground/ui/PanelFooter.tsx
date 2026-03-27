import {
  MdOutlineFullscreen as FullScreenIcon,
  MdOutlineFullscreenExit as ExitFullScreenIcon,
} from "react-icons/md";

import { Tooltip as CoreTooltip } from "@yeoncheols/portfolio-core-ui";

interface PanelFooterProps {
  isFullScreen?: boolean;
  onCloseFullScreen?: () => void;
  onFullScreen?: () => void;
}

const PanelFooter = ({
  isFullScreen,
  onCloseFullScreen,
  onFullScreen,
}: PanelFooterProps) => {
  return (
    <div className="flex items-center justify-between rounded-b-md border border-t-0 border-neutral-700 bg-neutral-900 px-2 py-1">
      <div className="items-center  text-sm text-neutral-500">
        &copy; <a href="https://aulianza.id">aulianza</a>
      </div>
      {isFullScreen ? (
        <CoreTooltip title="Close">
          <ExitFullScreenIcon
            size={22}
            onClick={onCloseFullScreen}
            className=" cursor-pointer text-neutral-500"
            data-umami-event="Open Fullscreen Playground"
          />
        </CoreTooltip>
      ) : (
        <CoreTooltip title="Fullscreen">
          <FullScreenIcon
            size={22}
            onClick={onFullScreen}
            className=" cursor-pointer text-neutral-500"
            data-umami-event="Exit Fullscreen Playground"
          />
        </CoreTooltip>
      )}
    </div>
  );
};

export default PanelFooter;
