import { render, screen } from "@testing-library/react";

import ContentBody from "@/features/learn/ui/ContentBody";

jest.mock("@/shared/ui/MDXComponent", () => {
  const MDXComponent = ({ children }: { children: string }) => (
    <div>{children}</div>
  );
  return MDXComponent;
});

describe("ContentBody", () => {
  it("본문 문자열을 렌더한다", () => {
    render(<ContentBody content="학습 본문" />);

    expect(screen.getByText("학습 본문")).toBeInTheDocument();
  });
});
