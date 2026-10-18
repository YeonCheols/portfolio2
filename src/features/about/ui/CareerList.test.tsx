import { render, screen } from "@testing-library/react";

import CareerList from "@/features/about/ui/CareerList";

jest.mock("@/features/about/ui/CareerCard", () => {
  const CareerCard = ({ company }: { company: string }) => (
    <article>{company}</article>
  );
  return CareerCard;
});

describe("CareerList", () => {
  it("경력의 회사 이름을 보여 준다", () => {
    render(<CareerList />);

    expect(screen.getByText("잡코리아")).toBeInTheDocument();
    expect(screen.getByText("행복쇼핑")).toBeInTheDocument();
  });
});
