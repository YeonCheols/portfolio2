import { render, screen } from "@testing-library/react";
import useSWR from "swr";

import BlogDetail from "@/features/blog/ui/BlogDetail";
import { fetcher } from "@/shared/api/fetcher";
import { BlogDetailProps } from "@/shared/types/blog";

jest.mock("swr", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("framer-motion", () => ({
  motion: {
    h1: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <h1 className={className}>{children}</h1>,
    div: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <div className={className}>{children}</div>,
  },
}));

jest.mock("@/shared/ui/MDXComponent", () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));

const mockedUseSWR = useSWR as jest.Mock;

const detail = {
  id: 7,
  slug: "hello",
  date: "2024-06-01T00:00:00.000Z",
  title: { rendered: "상세 제목" },
  content: { rendered: "alpha beta gamma delta epsilon", markdown: "# 본문" },
  tags_list: [{ term_id: 3, name: "typescript" }],
} as BlogDetailProps;

describe("BlogDetail", () => {
  beforeEach(() => {
    mockedUseSWR.mockReturnValue({ data: { views: 15 } });
  });

  it("조회수와 본문, 태그를 보여 준다", () => {
    render(<BlogDetail {...detail} />);

    expect(mockedUseSWR).toHaveBeenCalledWith(
      "/api/views?slug=hello&id=7",
      fetcher,
    );
    expect(
      screen.getByRole("heading", { name: "상세 제목" }),
    ).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("June 01, 2024")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("# 본문")).toBeInTheDocument();
    expect(screen.getByText("Tags:")).toBeInTheDocument();
    expect(screen.getByText("Typescript")).toBeInTheDocument();
  });

  it("태그가 없으면 태그 영역을 렌더하지 않는다", () => {
    render(<BlogDetail {...detail} tags_list={[]} />);

    expect(screen.queryByText("Tags:")).not.toBeInTheDocument();
  });

  it("본문이 없으면 마크다운을 렌더하지 않는다", () => {
    render(
      <BlogDetail
        {...detail}
        content={{ rendered: "", markdown: "숨김", protected: false }}
      />,
    );

    expect(screen.queryByText("숨김")).not.toBeInTheDocument();
  });
});
