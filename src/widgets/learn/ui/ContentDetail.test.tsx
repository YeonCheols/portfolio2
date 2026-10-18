import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/router";
import useSWR from "swr";

import ContentDetail from "@/widgets/learn/ui/ContentDetail";
import { SubContentMetaProps } from "@/shared/types/learn";

jest.mock("next/router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("swr", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("@/features/learn/ui/ContentBody", () => {
  const ContentBody = ({ content }: { content: string }) => (
    <div>{content}</div>
  );
  return ContentBody;
});
jest.mock("@/widgets/learn/ui/ContentPlayground", () => {
  const ContentPlayground = ({ initialCode }: { initialCode: string }) => (
    <div>플레이그라운드 {initialCode}</div>
  );
  return ContentPlayground;
});
jest.mock("@/features/blog/ui/GiscusComment", () => {
  const GiscusComment = () => <div>댓글</div>;
  return GiscusComment;
});

const mockedUseRouter = useRouter as jest.Mock;
const mockedUseSWR = useSWR as jest.Mock;

const meta = (
  overrides: Partial<SubContentMetaProps> = {},
): SubContentMetaProps => ({
  id: 1,
  title: "훅",
  category: "React",
  created_at: "2024-01-01",
  updated_at: "2024-01-02",
  is_playground: false,
  is_comment: false,
  ...overrides,
});

const lessons = [
  { id: 0, parent_slug: "react", slug: "intro", title: "소개" },
  { id: 1, parent_slug: "react", slug: "hooks", title: "훅" },
  { id: 2, parent_slug: "react", slug: "state", title: "상태" },
];

describe("ContentDetail", () => {
  const push = jest.fn();

  beforeEach(() => {
    push.mockReset();
    window.scrollTo = jest.fn();
    mockedUseRouter.mockReturnValue({
      pathname: "/learn/[slug]/[content]",
      asPath: "/learn/react/hooks",
      push,
    });
    mockedUseSWR.mockReturnValue({ data: { data: lessons } });
  });

  it("본문이 있으면 본문을 보여 준다", () => {
    render(<ContentDetail content="학습 본문" frontMatter={meta()} />);

    expect(screen.getByText("학습 본문")).toBeInTheDocument();
  });

  it("이전과 다음 제목을 보여 주고 누르면 해당 레슨으로 이동한다", async () => {
    const user = userEvent.setup();
    render(<ContentDetail content="학습 본문" frontMatter={meta()} />);

    expect(
      await screen.findByRole("button", { name: /Previous/ }),
    ).toHaveTextContent("소개");
    expect(screen.getByRole("button", { name: /Next/ })).toHaveTextContent(
      "상태",
    );

    await user.click(screen.getByRole("button", { name: /Next/ }));
    expect(push).toHaveBeenCalledWith("/learn/react/state");

    await user.click(screen.getByRole("button", { name: /Previous/ }));
    expect(push).toHaveBeenCalledWith("/learn/react/intro");
  });

  it("첫 레슨이면 이전 버튼을 보여 주지 않는다", async () => {
    mockedUseRouter.mockReturnValue({
      pathname: "/learn/[slug]/[content]",
      asPath: "/learn/react/intro",
      push,
    });

    render(<ContentDetail content="학습 본문" frontMatter={meta()} />);

    expect(
      await screen.findByRole("button", { name: /Next/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Previous/ }),
    ).not.toBeInTheDocument();
  });

  it("플레이그라운드와 댓글이 켜져 있으면 함께 보여 준다", () => {
    render(
      <ContentDetail
        content="학습 본문"
        frontMatter={meta({
          is_playground: true,
          is_comment: true,
          initial_code: "console.log(1)",
        })}
      />,
    );

    expect(
      screen.getByText("플레이그라운드 console.log(1)"),
    ).toBeInTheDocument();
    expect(screen.getByText("댓글")).toBeInTheDocument();
  });

  it("플레이그라운드와 댓글이 꺼져 있으면 보여 주지 않는다", () => {
    render(<ContentDetail content="학습 본문" frontMatter={meta()} />);

    expect(screen.queryByText(/플레이그라운드/)).not.toBeInTheDocument();
    expect(screen.queryByText("댓글")).not.toBeInTheDocument();
  });

  it("본문이 없으면 본문 영역을 보여 주지 않는다", () => {
    render(<ContentDetail content="" frontMatter={meta()} />);

    expect(screen.queryByText("학습 본문")).not.toBeInTheDocument();
  });
});
