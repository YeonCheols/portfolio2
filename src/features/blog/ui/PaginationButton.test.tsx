import { fireEvent, render, screen } from "@testing-library/react";

import PaginationButton from "@/features/blog/ui/PaginationButton";

describe("PaginationButton", () => {
  it("이전 버튼을 누르면 아이콘을 앞에 두고 클릭을 전달한다", () => {
    const onClick = jest.fn();
    const { container } = render(
      <PaginationButton
        onClick={onClick}
        text="Previous"
        icon={<span>prev-icon</span>}
      />,
    );

    expect(container.textContent).toBe("prev-iconPrevious");

    fireEvent.click(screen.getByText("Previous"));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("다음 버튼이면 아이콘을 뒤에 둔다", () => {
    const { container } = render(
      <PaginationButton
        onClick={jest.fn()}
        text="Next"
        icon={<span>next-icon</span>}
      />,
    );

    expect(container.textContent).toBe("Nextnext-icon");
  });

  it("이전이나 다음이 아니면 아이콘을 렌더하지 않는다", () => {
    const { container } = render(
      <PaginationButton
        onClick={jest.fn()}
        text="Page"
        icon={<span>icon</span>}
      />,
    );

    expect(container.textContent).toBe("Page");
  });
});
