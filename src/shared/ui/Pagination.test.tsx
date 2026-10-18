import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Pagination from "@/shared/ui/Pagination";

const iconButtons = () =>
  screen
    .getAllByRole("button")
    .filter((button) => button.textContent?.trim() === "");

describe("Pagination", () => {
  it("전체 페이지가 없으면 페이지를 보여 주지 않는다", () => {
    const { container } = render(
      <Pagination totalPages={0} currentPage={1} onPageChange={jest.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("페이지 번호를 누르면 해당 페이지로 바꾼다", async () => {
    const user = userEvent.setup();
    const onPageChange = jest.fn();
    render(
      <Pagination totalPages={3} currentPage={2} onPageChange={onPageChange} />,
    );

    await user.click(screen.getByRole("button", { name: "3" }));

    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("다음을 누르면 다음 페이지로 바꾼다", async () => {
    const user = userEvent.setup();
    const onPageChange = jest.fn();
    render(
      <Pagination totalPages={3} currentPage={2} onPageChange={onPageChange} />,
    );

    await user.click(iconButtons()[1]);

    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("이전을 누르면 이전 페이지로 바꾼다", async () => {
    const user = userEvent.setup();
    const onPageChange = jest.fn();
    render(
      <Pagination totalPages={3} currentPage={2} onPageChange={onPageChange} />,
    );

    await user.click(iconButtons()[0]);

    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("첫 페이지이면 이전 버튼을 보여 주지 않는다", async () => {
    const user = userEvent.setup();
    const onPageChange = jest.fn();
    render(
      <Pagination totalPages={3} currentPage={1} onPageChange={onPageChange} />,
    );

    expect(iconButtons()).toHaveLength(1);
    await user.click(iconButtons()[0]);

    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("마지막 페이지이면 다음 버튼을 보여 주지 않는다", async () => {
    const user = userEvent.setup();
    const onPageChange = jest.fn();
    render(
      <Pagination totalPages={3} currentPage={3} onPageChange={onPageChange} />,
    );

    expect(iconButtons()).toHaveLength(1);
    expect(screen.getByRole("button", { name: "1" })).toBeEnabled();
    await user.click(iconButtons()[0]);

    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("생략 표시를 누르면 현재 페이지를 유지한다", async () => {
    const user = userEvent.setup();
    const onPageChange = jest.fn();
    render(
      <Pagination
        totalPages={10}
        currentPage={5}
        onPageChange={onPageChange}
      />,
    );

    const ellipses = screen.getAllByRole("button", { name: "..." });
    expect(ellipses.length).toBeGreaterThan(0);
    await user.click(ellipses[0]);

    expect(onPageChange).toHaveBeenCalledWith(5);
  });
});
