import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Button from "@/shared/ui/Button";

describe("Button", () => {
  it("아이콘과 자식을 렌더하고 클릭하면 onClick을 호출한다", async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(
      <Button icon={<span>아이콘</span>} onClick={onClick}>
        저장
      </Button>,
    );

    expect(screen.getByText("아이콘")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "아이콘 저장" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("로딩 중이면 Loading...만 표시한다", () => {
    render(
      <Button isLoading icon={<span>아이콘</span>}>
        저장
      </Button>,
    );

    expect(
      screen.getByRole("button", { name: "Loading..." }),
    ).toBeInTheDocument();
    expect(screen.queryByText("저장")).not.toBeInTheDocument();
    expect(screen.queryByText("아이콘")).not.toBeInTheDocument();
  });

  it("disabled를 넘기면 버튼을 비활성화한다", () => {
    render(<Button disabled>저장</Button>);

    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
  });
});
