import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Tabs } from "@/shared/ui/Tabs";

jest.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: {
    div: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
}));

const tabs = [
  { label: "글", children: <p>글 내용</p> },
  { label: "프로젝트", children: <p>프로젝트 내용</p> },
];

describe("Tabs", () => {
  it("활성 탭이 없으면 첫 탭 내용을 보여 준다", () => {
    render(<Tabs tabs={tabs} />);

    expect(screen.getByRole("button", { name: "글" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "프로젝트" }),
    ).toBeInTheDocument();
    expect(screen.getByText("글 내용")).toBeInTheDocument();
    expect(screen.queryByText("프로젝트 내용")).not.toBeInTheDocument();
  });

  it("활성 탭이 있으면 그 탭 내용을 보여 준다", () => {
    render(
      <Tabs
        tabs={[
          { label: "글", children: <p>글 내용</p> },
          {
            label: "프로젝트",
            children: <p>프로젝트 내용</p>,
            isActive: true,
          },
        ]}
      />,
    );

    expect(screen.getByText("프로젝트 내용")).toBeInTheDocument();
    expect(screen.queryByText("글 내용")).not.toBeInTheDocument();
  });

  it("다른 탭을 누르면 그 내용을 보여 준다", async () => {
    const user = userEvent.setup();
    render(<Tabs tabs={tabs} />);

    await user.click(screen.getByRole("button", { name: "프로젝트" }));

    await waitFor(
      () => {
        expect(screen.getByText("프로젝트 내용")).toBeInTheDocument();
        expect(screen.queryByText("글 내용")).not.toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });
});
