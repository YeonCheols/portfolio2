import { render, screen } from "@testing-library/react";

import SectionSubHeading from "@/shared/ui/SectionSubHeading";

describe("SectionSubHeading", () => {
  it("자식 내용을 렌더한다", () => {
    render(<SectionSubHeading>보조 제목</SectionSubHeading>);

    expect(screen.getByText("보조 제목")).toBeInTheDocument();
  });
});
