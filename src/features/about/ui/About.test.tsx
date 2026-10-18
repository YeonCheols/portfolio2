import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import About from "@/features/about/ui/About";
import { ActiveTabKeys } from "@/shared/types/about";

jest.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
}));

describe("About", () => {
  it("소개 탭이 활성화되면 소개 문구를 보여 준다", () => {
    render(<About activeTab={ActiveTabKeys.about} />);

    expect(screen.getByRole("button", { name: "소개" })).toBeInTheDocument();
    expect(
      screen.getByText(/프론트엔드 개발자 성연철입니다/),
    ).toBeInTheDocument();
  });

  it("다른 탭을 누르면 해당 내용을 보여 준다", async () => {
    const user = userEvent.setup();
    render(<About activeTab={ActiveTabKeys.about} />);

    await user.click(screen.getByRole("button", { name: "타임라인" }));
    expect(screen.getByText("나의 여정")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "잡코리아" })).toHaveAttribute(
      "href",
      "https://m.albamon.com/",
    );

    await user.click(screen.getByRole("button", { name: "경력사항" }));
    expect(
      screen.getAllByRole("button", { name: "담당업무" }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "행복쇼핑" })).toHaveAttribute(
      "href",
      "https://m.pping.kr/",
    );

    await user.click(screen.getByRole("button", { name: "이력서" }));
    expect(
      screen.getByRole("link", { name: "이력서 다운로드" }),
    ).toHaveAttribute("href", "/download/성연철_경력기술서.pdf");

    await user.click(screen.getByRole("button", { name: "교육" }));
    expect(screen.getByRole("link", { name: "KH정보교육원" })).toHaveAttribute(
      "href",
      "https://www.kh.or.kr/",
    );
  });
});
