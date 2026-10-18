import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import NavigationSection from "@/shared/ui/NavigationSection";

const renderNavigation = (
  override: Partial<{
    currentIndex: number;
    totalItems: number;
    handleNext: () => void;
    handlePrevious: () => void;
    previousTitle: string | null;
    nextTitle: string | null;
  }> = {},
) => {
  const handleNext = override.handleNext ?? jest.fn();
  const handlePrevious = override.handlePrevious ?? jest.fn();

  render(
    <NavigationSection
      currentIndex={override.currentIndex ?? 1}
      totalItems={override.totalItems ?? 3}
      handleNext={handleNext}
      handlePrevious={handlePrevious}
      previousTitle={
        override.previousTitle === undefined
          ? "이전 글"
          : override.previousTitle
      }
      nextTitle={
        override.nextTitle === undefined ? "다음 글" : override.nextTitle
      }
    />,
  );

  return { handleNext, handlePrevious };
};

describe("NavigationSection", () => {
  it("이전과 다음이 있으면 두 이동 버튼을 보여 준다", () => {
    renderNavigation();

    expect(screen.getByRole("button", { name: /Previous/ })).toHaveTextContent(
      "이전 글",
    );
    expect(screen.getByRole("button", { name: /Next/ })).toHaveTextContent(
      "다음 글",
    );
  });

  it("이전을 누르면 이전 핸들러를 호출한다", async () => {
    const user = userEvent.setup();
    const { handlePrevious } = renderNavigation();

    await user.click(screen.getByRole("button", { name: /Previous/ }));

    expect(handlePrevious).toHaveBeenCalledTimes(1);
  });

  it("다음을 누르면 다음 핸들러를 호출한다", async () => {
    const user = userEvent.setup();
    const { handleNext } = renderNavigation();

    await user.click(screen.getByRole("button", { name: /Next/ }));

    expect(handleNext).toHaveBeenCalledTimes(1);
  });

  it("첫 항목이면 이전 버튼을 보여 주지 않는다", () => {
    renderNavigation({ currentIndex: 0, previousTitle: "이전 글" });

    expect(
      screen.queryByRole("button", { name: /Previous/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Next/ })).toBeInTheDocument();
  });

  it("마지막 항목이면 다음 버튼을 보여 주지 않는다", () => {
    renderNavigation({ currentIndex: 2, totalItems: 3, nextTitle: "다음 글" });

    expect(
      screen.getByRole("button", { name: /Previous/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Next/ }),
    ).not.toBeInTheDocument();
  });

  it("제목이 없으면 이동 버튼을 보여 주지 않는다", () => {
    renderNavigation({ previousTitle: null, nextTitle: null });

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
