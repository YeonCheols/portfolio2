import { render, screen } from "@testing-library/react";

import EducationList from "@/features/about/ui/EducationList";

jest.mock("@/features/about/ui/EducationCard", () => {
  const EducationCard = ({ school }: { school: string }) => (
    <article>{school}</article>
  );
  return EducationCard;
});

describe("EducationList", () => {
  it("학교 이름을 보여 준다", () => {
    render(<EducationList />);

    expect(screen.getByText("KH정보교육원")).toBeInTheDocument();
    expect(screen.getByText("김포대학교")).toBeInTheDocument();
  });
});
