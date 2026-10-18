import { render, screen } from "@testing-library/react";

import Resume from "@/features/about/ui/Resume";

describe("Resume", () => {
  it("이력서 다운로드 링크를 보여 준다", () => {
    render(<Resume />);

    const link = screen.getByRole("link", { name: "이력서 다운로드" });
    expect(link).toHaveAttribute("href", "/download/성연철_경력기술서.pdf");
    expect(link).toHaveAttribute("download", "ycseng_resume.pdf");
  });
});
