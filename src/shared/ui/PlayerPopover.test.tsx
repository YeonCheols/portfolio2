import { Popover } from "@headlessui/react";
import { render, screen } from "@testing-library/react";

import { NowPlayingProps } from "@/shared/types/spotify";
import PlayerPopover from "@/shared/ui/PlayerPopover";

const playing: NowPlayingProps = {
  songUrl: "https://open.spotify.com/track/1",
  albumImageUrl: "https://example.com/album.jpg",
  album: "앨범",
  title: "노래",
  artist: "가수",
};

const renderPlayer = (isShow: boolean, track: NowPlayingProps) =>
  render(
    <Popover>
      <PlayerPopover isShow={isShow} playing={track} />
    </Popover>,
  );

describe("PlayerPopover", () => {
  it("재생 정보를 보여 주면 곡 정보를 보여 준다", () => {
    renderPlayer(true, playing);

    expect(screen.getByText("노래")).toBeInTheDocument();
    expect(screen.getByText("가수")).toBeInTheDocument();
    expect(screen.getByText("Album:")).toBeInTheDocument();
    expect(screen.getByText("앨범")).toBeInTheDocument();
  });

  it("앨범 이미지가 있으면 이미지를 보여 준다", () => {
    renderPlayer(true, playing);

    expect(screen.getByRole("img", { name: "앨범" })).toBeInTheDocument();
  });

  it("앨범 이미지가 없으면 이미지를 보여 주지 않는다", () => {
    renderPlayer(true, { ...playing, albumImageUrl: undefined });

    expect(screen.getByText("노래")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "앨범" })).not.toBeInTheDocument();
  });

  it("숨기면 곡 정보를 보여 주지 않는다", () => {
    renderPlayer(false, playing);

    expect(screen.queryByText("노래")).not.toBeInTheDocument();
    expect(screen.queryByText("Album:")).not.toBeInTheDocument();
  });
});
