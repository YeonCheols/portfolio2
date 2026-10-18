import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Card from "@/shared/ui/Card";

describe("Card", () => {
  it("자식을 렌더하고 클릭하면 전달한 핸들러를 호출한다", async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(
      <Card onClick={onClick} data-testid="card">
        본문
      </Card>,
    );

    expect(screen.getByTestId("card")).toHaveTextContent("본문");
    await user.click(screen.getByText("본문"));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
