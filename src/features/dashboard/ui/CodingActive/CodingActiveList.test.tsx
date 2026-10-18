import { render, screen } from "@testing-library/react";

import CodingActiveList from "@/features/dashboard/ui/CodingActive/CodingActiveList";

describe("CodingActiveList", () => {
  it("데이터가 없으면 아무것도 렌더하지 않는다", () => {
    const { container } = render(<CodingActiveList />);

    expect(container).toBeEmptyDOMElement();
  });

  it("목록이 비어 있으면 제목만 표시한다", () => {
    render(<CodingActiveList data={{ languages: [], categories: [] }} />);

    expect(screen.getByText("Languages")).toBeInTheDocument();
    expect(screen.getByText("Categories")).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("항목이 있으면 언어와 카테고리 진행률을 표시한다", () => {
    const languages = [
      { name: "TypeScript", hours: 2, minutes: 30, percent: 60 },
    ];
    const categories = [{ name: "Coding", hours: 1, minutes: 15, percent: 40 }];

    render(<CodingActiveList data={{ languages, categories }} />);

    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByText("Coding")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
  });
});
