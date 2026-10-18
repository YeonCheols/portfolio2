import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/router";

import BackButton from "@/shared/ui/BackButton";

jest.mock("next/router", () => ({
  useRouter: jest.fn(),
}));

const mockedUseRouter = useRouter as jest.Mock;

describe("BackButton", () => {
  const back = jest.fn();

  beforeEach(() => {
    back.mockReset();
    mockedUseRouter.mockReturnValue({
      back,
      push: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      pathname: "/",
      query: {},
      asPath: "/",
    });
  });

  it("url이 없으면 Back을 클릭해 뒤로 이동한다", async () => {
    const user = userEvent.setup();
    render(<BackButton />);

    expect(screen.getByText("Back")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();

    await user.click(screen.getByText("Back"));

    expect(back).toHaveBeenCalledTimes(1);
  });

  it("url이 있으면 그 주소의 링크를 렌더한다", () => {
    render(<BackButton url="/posts" />);

    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute(
      "href",
      "/posts",
    );
    expect(back).not.toHaveBeenCalled();
  });
});
