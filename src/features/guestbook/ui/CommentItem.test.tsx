import { render, screen } from "@testing-library/react";

import CommentItem from "@/features/guestbook/ui/CommentItem";

const createdAt = "2024-05-06T07:08:00.000Z";

describe("CommentItem", () => {
  it("이름과 첫 글자와 메시지와 작성 시각을 표시한다", () => {
    const formatted = new Date(createdAt).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    render(
      <CommentItem
        comment={{
          id: "c1",
          guestbookId: "g1",
          name: "ada",
          message: "반갑습니다",
          createdAt,
        }}
      />,
    );

    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("ada")).toBeInTheDocument();
    expect(screen.getByText("반갑습니다")).toBeInTheDocument();
    expect(screen.getByText(formatted)).toBeInTheDocument();
  });
});
