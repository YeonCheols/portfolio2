import { render, screen } from "@testing-library/react";

import Story from "@/features/about/ui/Story";

describe("Story", () => {
  it("소개 문구를 보여 준다", () => {
    render(<Story />);

    expect(
      screen.getByText(/프론트엔드 개발자 성연철입니다/),
    ).toBeInTheDocument();
  });
});
