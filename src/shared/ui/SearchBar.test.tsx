import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import SearchBar from "@/shared/ui/SearchBar";

const Harness = ({
  initialTerm = "",
  onSearchChange,
  onClearSearch,
}: {
  initialTerm?: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
}) => {
  const [searchTerm, setSearchTerm] = useState(initialTerm);

  return (
    <SearchBar
      searchTerm={searchTerm}
      onSearchChange={(event) => {
        onSearchChange(event.target.value);
        setSearchTerm(event.target.value);
      }}
      onClearSearch={() => {
        onClearSearch();
        setSearchTerm("");
      }}
    />
  );
};

describe("SearchBar", () => {
  it("검색어를 입력하면 변경 핸들러를 호출한다", async () => {
    const user = userEvent.setup();
    const onSearchChange = jest.fn();
    render(
      <Harness onSearchChange={onSearchChange} onClearSearch={jest.fn()} />,
    );

    await user.type(screen.getByPlaceholderText("Search..."), "리");

    expect(onSearchChange).toHaveBeenCalledWith("리");
    expect(screen.getByPlaceholderText("Search...")).toHaveValue("리");
  });

  it("검색어가 있으면 지우기를 눌러 검색어를 비운다", async () => {
    const user = userEvent.setup();
    const onClearSearch = jest.fn();
    const { container } = render(
      <Harness
        initialTerm="리액트"
        onSearchChange={jest.fn()}
        onClearSearch={onClearSearch}
      />,
    );

    const icons = container.querySelectorAll("svg");
    expect(icons).toHaveLength(2);
    await user.click(icons[1]);

    expect(onClearSearch).toHaveBeenCalledTimes(1);
    expect(screen.getByPlaceholderText("Search...")).toHaveValue("");
  });

  it("검색어가 없으면 지우기 아이콘을 보여 주지 않는다", () => {
    const { container } = render(
      <SearchBar
        searchTerm=""
        onSearchChange={jest.fn()}
        onClearSearch={jest.fn()}
      />,
    );

    expect(screen.getByPlaceholderText("Search...")).toHaveValue("");
    expect(container.querySelectorAll("svg")).toHaveLength(1);
  });
});
