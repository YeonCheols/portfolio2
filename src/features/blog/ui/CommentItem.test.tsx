import { render, screen } from "@testing-library/react";

import CommentItem from "@/features/blog/ui/CommentItem";
import { CommentItemProps } from "@/shared/types/blog";

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt, src }: { alt: string; src: string }) => (
    <img alt={alt} src={src} />
  ),
}));

const comment = {
  id_code: "c1",
  created_at: "2024-06-01T00:00:00.000Z",
  body_html: "<p>안녕</p><code>const a = 1</code>",
  user: {
    name: "연철",
    profile_image_90: "/avatar.png",
  },
} as CommentItemProps;

describe("CommentItem", () => {
  it("작성자와 날짜, 본문을 보여 주고 코드에 줄바꿈 클래스를 붙인다", () => {
    const { container } = render(<CommentItem {...comment} />);

    expect(screen.getByText("연철")).toBeInTheDocument();
    expect(screen.getByText("Jun 01, 2024, 07:00")).toBeInTheDocument();
    expect(screen.getByText("안녕")).toBeInTheDocument();
    expect(screen.getByAltText("연철")).toHaveAttribute("src", "/avatar.png");

    const code = container.querySelector("code");
    expect(code).toHaveClass("break-words");
    expect(code).toHaveClass("text-xs");
    expect(code).toHaveClass("whitespace-pre-wrap");
  });
});
