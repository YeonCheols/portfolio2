import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ContentList from "@/features/learn/ui/ContentList";
import { MdxFileContentProps } from "@/shared/types/learn";

jest.mock("@/features/learn/ui/LearnSubContentItem", () => {
  const LearnSubContentItem = ({ title }: { title: string }) => (
    <div>{title}</div>
  );
  return LearnSubContentItem;
});

const lesson = (
  slug: string,
  title: string,
  chapterId?: number,
  chapterTitle?: string,
): MdxFileContentProps =>
  ({
    slug,
    content: "",
    frontMatter: {
      id: 1,
      title,
      category: "react",
      created_at: "",
      updated_at: "",
      is_playground: false,
      is_comment: false,
      chapter_id: chapterId,
      chapter_title: chapterTitle,
    },
  }) as MdxFileContentProps;

describe("ContentList", () => {
  it("레슨이 없으면 빈 상태를 보여 준다", () => {
    render(<ContentList sortedSubContents={[]} content={null} title="React" />);

    expect(screen.getByText("No Lesson Found.")).toBeInTheDocument();
  });

  it("챕터가 하나면 레슨을 펼쳐 보여 준다", () => {
    render(
      <ContentList
        sortedSubContents={[lesson("intro", "소개", 1, "기초")]}
        content={null}
        title="React"
      />,
    );

    expect(screen.getByText("기초")).toBeInTheDocument();
    expect(screen.getByText("1 Lesson")).toBeInTheDocument();
    expect(screen.getByText("소개")).toBeInTheDocument();
  });

  it("챕터가 여러 개면 접혀 있고 누르면 레슨을 보여 준다", async () => {
    const user = userEvent.setup();
    render(
      <ContentList
        sortedSubContents={[
          lesson("intro", "소개", 1, "기초"),
          lesson("state", "상태", 2, "심화"),
        ]}
        content={null}
        title="React"
      />,
    );

    expect(screen.getAllByText("1 Lesson")).toHaveLength(2);
    expect(screen.queryByText("소개")).not.toBeInTheDocument();

    await user.click(screen.getByText("기초"));
    expect(screen.getByText("소개")).toBeInTheDocument();

    await user.click(screen.getByText("기초"));
    expect(screen.queryByText("소개")).not.toBeInTheDocument();
  });

  it("ungrouped 챕터는 챕터 제목을 보여 주지 않는다", () => {
    render(
      <ContentList
        sortedSubContents={[lesson("intro", "소개")]}
        content={{
          id: 1,
          title: "React",
          slug: "react",
          description: "",
          image: "",
          is_new: false,
          level: "Beginner",
          is_show: true,
        }}
        title="React"
      />,
    );

    expect(screen.queryByText("ungrouped")).not.toBeInTheDocument();
    expect(screen.getByText("소개")).toBeInTheDocument();
  });
});
