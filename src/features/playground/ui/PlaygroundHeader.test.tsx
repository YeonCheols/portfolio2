import { render, screen } from "@testing-library/react";

import PlaygroundHeader from "@/features/playground/ui/PlaygroundHeader";

describe("PlaygroundHeader", () => {
  it("플레이그라운드 제목과 설명을 표시한다", () => {
    render(<PlaygroundHeader />);

    expect(
      screen.getByRole("heading", { name: "JavaScript Playground" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("A no-fuss pure JavaScript playground with feedback"),
    ).toBeInTheDocument();
  });
});
