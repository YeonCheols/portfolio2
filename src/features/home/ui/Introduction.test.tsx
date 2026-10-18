import { render, screen } from "@testing-library/react";

import Introduction from "@/features/home/ui/Introduction";

describe("Introduction", () => {
  it("인사 문구와 소개를 보여 준다", () => {
    render(<Introduction />);

    expect(
      screen.getByRole("heading", {
        name: "안녕하세요, 프론트엔드 개발자 성연철입니다",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /누구나 자유롭게 개발을 이어갈 수 있는 환경을 좋아합니다/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("👋")).toBeInTheDocument();
  });
});
