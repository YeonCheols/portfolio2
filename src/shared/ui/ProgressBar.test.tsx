import { render } from "@testing-library/react";
import Router from "next/router";
import NProgress from "nprogress";

import ProgressBar from "@/shared/ui/ProgressBar";

describe("ProgressBar", () => {
  beforeEach(() => {
    jest.spyOn(NProgress, "start").mockImplementation(() => NProgress);
    jest.spyOn(NProgress, "done").mockImplementation(() => NProgress);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("렌더하면 화면에 막대를 보여 주지 않는다", () => {
    const { container } = render(<ProgressBar />);

    expect(container).toBeEmptyDOMElement();
  });

  it("경로가 바뀌기 시작하면 진행을 시작한다", () => {
    render(<ProgressBar />);

    Router.events.emit("routeChangeStart");

    expect(NProgress.start).toHaveBeenCalled();
  });

  it("경로 변경이 끝나면 진행을 끝낸다", () => {
    render(<ProgressBar />);

    Router.events.emit("routeChangeComplete");

    expect(NProgress.done).toHaveBeenCalled();
  });

  it("경로 변경이 실패하면 진행을 끝낸다", () => {
    render(<ProgressBar />);

    Router.events.emit("routeChangeError");

    expect(NProgress.done).toHaveBeenCalled();
  });
});
