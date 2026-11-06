import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { SelectField } from "./select-field";

const options = [
  { value: "development", label: "개발" },
  { value: "production", label: "운영" },
] as const;

const Example = () => {
  const [value, setValue] = useState<string>("development");
  return (
    <SelectField
      id="environment"
      label="환경"
      value={value}
      onChange={setValue}
      options={options}
    />
  );
};

describe("SelectField", () => {
  it("메뉴에서 항목을 고르면 선택값을 표시하고 버튼으로 포커스를 돌려준다", async () => {
    render(<Example />);
    const user = userEvent.setup();
    const trigger = screen.getByRole("button", { name: "환경" });
    await user.click(trigger);
    expect(
      screen
        .getByRole("option", { name: "개발" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    await user.click(screen.getByRole("option", { name: "운영" }));
    expect(trigger.textContent).toContain("운영");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("Escape와 바깥 클릭으로 닫으면 선택값을 변경하지 않는다", async () => {
    render(
      <>
        <Example />
        <button type="button">다른 작업</button>
      </>,
    );
    const user = userEvent.setup();
    const trigger = screen.getByRole("button", { name: "환경" });
    await user.click(trigger);
    await user.keyboard("{ArrowDown}{Escape}");
    expect(trigger.textContent).toContain("개발");
    expect(screen.queryByRole("listbox")).toBeNull();
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "다른 작업" }));
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(trigger.textContent).toContain("개발");
  });

  it("비활성화한 필드는 열거나 변경할 수 없다", async () => {
    const onChange = vi.fn();
    render(
      <SelectField
        id="environment"
        label="환경"
        value="development"
        onChange={onChange}
        options={options}
        disabled
      />,
    );
    const trigger = screen.getByRole("button", {
      name: "환경",
    }) as HTMLButtonElement;
    expect(trigger.disabled).toBe(true);
    await userEvent.setup().click(trigger);
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("옵션 이름이 잘리지 않도록 목록 너비를 내용에 맞춘다", async () => {
    const user = userEvent.setup();
    render(
      <SelectField
        id="environment"
        label="환경"
        value="development"
        options={[
          {
            value: "development",
            label: "개발 품질 평가 환경",
          },
          { value: "production", label: "운영 품질 평가 환경" },
        ]}
        onChange={() => undefined}
      />,
    );

    await user.click(screen.getByRole("button", { name: "환경" }));

    const listbox = screen.getByRole("listbox");
    const option = screen.getByRole("option", {
      name: "개발 품질 평가 환경",
    });

    expect(listbox.className).toContain("w-max");
    expect(option.querySelector("span")?.className).toContain(
      "whitespace-nowrap",
    );
  });
});
