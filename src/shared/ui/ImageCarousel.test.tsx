import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ForwardedRef, ReactNode } from "react";

import ImageCarousel from "@/shared/ui/ImageCarousel";

jest.mock("react-slick", () => {
  const React = require("react") as typeof import("react");

  const Slider = React.forwardRef(function MockSlider(
    props: {
      children?: ReactNode;
      slidesToShow?: number;
      speed?: number;
      autoplaySpeed?: number;
      autoplay?: boolean;
    },
    ref: ForwardedRef<{
      innerSlider: { list: HTMLDivElement | null };
      slickPlay: () => void;
      slickPause: () => void;
    }>,
  ) {
    const listRef = React.useRef<HTMLDivElement>(null);

    React.useImperativeHandle(ref, () => ({
      innerSlider: { list: listRef.current },
      slickPlay: () => {
        listRef.current?.setAttribute("data-playing", "true");
      },
      slickPause: () => {
        listRef.current?.setAttribute("data-playing", "false");
      },
    }));

    return (
      <div
        ref={listRef}
        data-testid="slider"
        data-slides={props.slidesToShow}
        data-speed={props.speed}
        data-autoplay-speed={props.autoplaySpeed}
        data-autoplay={String(props.autoplay)}
      >
        {props.children}
      </div>
    );
  });

  return { __esModule: true, default: Slider };
});

const setWidth = (width: number) => {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });
};

describe("ImageCarousel", () => {
  beforeEach(() => {
    setWidth(1024);
  });

  it("이미지를 넘기면 순서대로 alt를 붙이고 마우스가 들어오면 재생을 멈춘다", async () => {
    render(<ImageCarousel images={["/a.png", "/b.png"]} interval={1500} />);

    expect(
      (await screen.findAllByRole("img", { name: "Image 1" })).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("img", { name: "Image 2" }).length,
    ).toBeGreaterThan(0);

    const slider = screen.getByTestId("slider");
    expect(slider).toHaveAttribute("data-speed", "1500");
    expect(slider).toHaveAttribute("data-autoplay-speed", "1500");
    expect(slider).toHaveAttribute("data-autoplay", "true");

    await waitFor(() => {
      expect(slider).toHaveAttribute("data-playing", "true");
    });

    fireEvent.mouseEnter(slider);
    expect(slider).toHaveAttribute("data-playing", "false");

    fireEvent.mouseLeave(slider);
    expect(slider).toHaveAttribute("data-playing", "true");
  });

  it("이미지가 없으면 img를 렌더하지 않는다", () => {
    render(<ImageCarousel images={[]} />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByTestId("slider")).toHaveAttribute("data-speed", "3000");
  });

  it("화면이 좁으면 슬라이드 2개와 너비 130을 렌더한다", async () => {
    setWidth(400);
    render(<ImageCarousel images={["/a.png"]} />);

    await waitFor(() => {
      expect(screen.getByTestId("slider")).toHaveAttribute("data-slides", "2");
    });
    expect(screen.getByRole("img", { name: "Image 1" })).toHaveAttribute(
      "width",
      "130",
    );
  });

  it("화면이 중간 너비면 슬라이드 4개와 너비 145를 렌더한다", async () => {
    setWidth(700);
    render(<ImageCarousel images={["/a.png"]} />);

    await waitFor(() => {
      expect(screen.getByTestId("slider")).toHaveAttribute("data-slides", "4");
    });
    expect(screen.getByRole("img", { name: "Image 1" })).toHaveAttribute(
      "width",
      "145",
    );
  });

  it("화면이 넓으면 슬라이드 5개를 렌더한다", async () => {
    render(<ImageCarousel images={["/a.png"]} />);

    await waitFor(() => {
      expect(screen.getByTestId("slider")).toHaveAttribute("data-slides", "5");
    });
    expect(screen.getByRole("img", { name: "Image 1" })).toHaveAttribute(
      "width",
      "145",
    );
  });
});
