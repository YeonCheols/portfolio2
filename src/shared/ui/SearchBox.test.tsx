import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import SearchBox from "@/shared/ui/SearchBox";

describe("SearchBox", () => {
  it("검색을 누르면 클릭 핸들러를 호출한다", async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(<SearchBox onClick={onClick} />);

    await user.click(screen.getByText("Search"));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByText("k")).toBeInTheDocument();
  });

  it("클릭 핸들러가 없으면 검색 안내를 보여 준다", async () => {
    const user = userEvent.setup();
    render(<SearchBox />);

    await user.click(screen.getByText("Search"));

    expect(screen.getByText("Search")).toBeInTheDocument();
    expect(screen.getByText("k")).toBeInTheDocument();
  });
});
