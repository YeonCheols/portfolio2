import { fireEvent, render } from "@testing-library/react";

import ViewOptions from "@/features/blog/ui/ViewOptions";

describe("ViewOptions", () => {
  it("누르면 자신의 타입으로 보기를 바꾼다", () => {
    const setViewOption = jest.fn();
    const { getByRole } = render(
      <ViewOptions
        option="list"
        setViewOption={setViewOption}
        type="grid"
        icon={<span>grid</span>}
      />,
    );

    fireEvent.click(getByRole("button"));

    expect(setViewOption).toHaveBeenCalledWith("grid");
    expect(getByRole("button")).toHaveAttribute(
      "data-umami-event",
      "Change Blog View to grid",
    );
  });

  it("선택된 타입이면 활성 배경을 가진다", () => {
    const { getByRole } = render(
      <ViewOptions
        option="grid"
        setViewOption={jest.fn()}
        type="grid"
        icon={<span>grid</span>}
      />,
    );

    expect(getByRole("button")).toHaveClass("bg-neutral-200");
  });

  it("다른 타입이면 활성 배경을 가지지 않는다", () => {
    const { getByRole } = render(
      <ViewOptions
        option="list"
        setViewOption={jest.fn()}
        type="grid"
        icon={<span>grid</span>}
      />,
    );

    expect(getByRole("button")).not.toHaveClass("bg-neutral-200");
  });
});
