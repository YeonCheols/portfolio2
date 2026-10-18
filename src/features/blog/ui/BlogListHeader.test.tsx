import { fireEvent, render, screen } from "@testing-library/react";

import BlogListHeader from "@/features/blog/ui/BlogListHeader";

describe("BlogListHeader", () => {
  it("보기 버튼을 누르면 해당 옵션으로 바꾼다", () => {
    const setViewOption = jest.fn();
    render(<BlogListHeader viewOption="list" setViewOption={setViewOption} />);

    expect(
      screen.getByRole("heading", { name: "Latest Articles" }),
    ).toBeInTheDocument();

    fireEvent.click(
      document.querySelector('[data-umami-event="Change Blog View to grid"]')!,
    );
    fireEvent.click(
      document.querySelector('[data-umami-event="Change Blog View to list"]')!,
    );

    expect(setViewOption).toHaveBeenNthCalledWith(1, "grid");
    expect(setViewOption).toHaveBeenNthCalledWith(2, "list");
  });
});
