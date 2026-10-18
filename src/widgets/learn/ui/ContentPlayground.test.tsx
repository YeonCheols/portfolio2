import { render, screen } from "@testing-library/react";

import ContentPlayground from "@/widgets/learn/ui/ContentPlayground";

jest.mock("@/features/playground", () => {
  const Playground = ({ initialCode }: { initialCode: string }) => (
    <pre>{initialCode}</pre>
  );
  return Playground;
});

describe("ContentPlayground", () => {
  it("자바스크립트 플레이그라운드 제목과 초기 코드를 보여 준다", () => {
    render(<ContentPlayground initialCode="const a = 1;" />);

    expect(
      screen.getByRole("heading", { name: "JavaScript Playground" }),
    ).toBeInTheDocument();
    expect(screen.getByText("const a = 1;")).toBeInTheDocument();
  });
});
