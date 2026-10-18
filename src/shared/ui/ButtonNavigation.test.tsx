import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ButtonNavigation from "@/shared/ui/ButtonNavigation";

describe("ButtonNavigation", () => {
  it("next면 Next와 제목을 보여 주고 클릭하면 onClick을 호출한다", async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(
      <ButtonNavigation onClick={onClick} action="next" title="다음 글" />,
    );

    await user.click(screen.getByRole("button", { name: /Next/ }));

    expect(screen.getByRole("button")).toHaveTextContent("Next : 다음 글");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("previous면 Previous와 제목을 표시한다", () => {
    render(
      <ButtonNavigation
        onClick={jest.fn()}
        action="previous"
        title="이전 글"
      />,
    );

    expect(screen.getByRole("button")).toHaveTextContent("Previous : 이전 글");
  });

  it("제목이 없으면 콜론만 남긴다", () => {
    render(
      <ButtonNavigation onClick={jest.fn()} action="previous" title={null} />,
    );

    expect(screen.getByRole("button")).toHaveTextContent("Previous :");
    expect(screen.getByRole("button")).not.toHaveTextContent("null");
  });
});
