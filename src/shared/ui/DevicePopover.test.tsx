import { Popover } from "@headlessui/react";
import { render, screen } from "@testing-library/react";

import { DeviceProps } from "@/shared/types/spotify";
import DevicePopover from "@/shared/ui/DevicePopover";

const devices: DeviceProps[] = [
  {
    name: "Mac",
    type: "Computer",
    is_active: true,
    model: "MacBook Pro M1",
    id: "aulianza-mac",
  },
  {
    name: "Phone",
    type: "Smartphone",
    is_active: false,
    model: "iPhone 13 Pro",
    id: "aulianza-iphone",
  },
  {
    name: "기타",
    type: "Car",
    is_active: false,
    model: "알 수 없음",
  },
];

const renderPopover = (props: { devices: DeviceProps[]; isShow: boolean }) =>
  render(
    <Popover>
      <DevicePopover {...props} />
    </Popover>,
  );

describe("DevicePopover", () => {
  it("보이면 기기 이름과 모델을 렌더한다", () => {
    renderPopover({ devices, isShow: true });

    expect(screen.getByText("Mac")).toBeInTheDocument();
    expect(screen.getByText("MacBook Pro M1")).toBeInTheDocument();
    expect(screen.getByText("Phone")).toBeInTheDocument();
    expect(screen.getByText("iPhone 13 Pro")).toBeInTheDocument();
    expect(screen.getByText("기타")).toBeInTheDocument();
    expect(screen.getByText("알 수 없음")).toBeInTheDocument();
  });

  it("활성 기기만 재생 막대 네 개를 렌더한다", () => {
    const { container } = renderPopover({ devices, isShow: true });

    expect(container.querySelectorAll(".bg-green-500")).toHaveLength(4);
  });

  it("목록이 비어 있으면 기기 이름을 렌더하지 않는다", () => {
    const { container } = renderPopover({ devices: [], isShow: true });

    expect(container.textContent?.trim()).toBe("");
    expect(container.querySelectorAll(".bg-green-500")).toHaveLength(0);
  });

  it("isShow가 false면 기기 목록을 숨긴다", () => {
    renderPopover({ devices, isShow: false });

    expect(screen.queryByText("Mac")).not.toBeInTheDocument();
    expect(screen.queryByText("Phone")).not.toBeInTheDocument();
  });
});
