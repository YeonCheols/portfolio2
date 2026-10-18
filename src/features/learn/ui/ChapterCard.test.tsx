import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ChapterCard from "@/features/learn/ui/ChapterCard";
import { MdxFileContentProps } from "@/shared/types/learn";

const contents = [
  { slug: "a", content: "", frontMatter: { title: "첫째" } },
  { slug: "b", content: "", frontMatter: { title: "둘째" } },
] as MdxFileContentProps[];

describe("ChapterCard", () => {
  it("레슨이 하나면 Lesson이라고 보여 준다", () => {
    render(
      <ChapterCard
        chapterId="1"
        chapterTitle="기초"
        contents={[contents[0]]}
        openAccordions={[]}
        onToggle={jest.fn()}
      />,
    );

    expect(screen.getByText("기초")).toBeInTheDocument();
    expect(screen.getByText("1 Lesson")).toBeInTheDocument();
  });

  it("레슨이 여러 개면 Lessons라고 보여 준다", () => {
    render(
      <ChapterCard
        chapterId="1"
        chapterTitle="기초"
        contents={contents}
        openAccordions={["1"]}
        onToggle={jest.fn()}
      />,
    );

    expect(screen.getByText("2 Lessons")).toBeInTheDocument();
  });

  it("챕터를 누르면 onToggle에 챕터 아이디를 전달한다", async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn();
    render(
      <ChapterCard
        chapterId="hooks"
        chapterTitle="훅"
        contents={contents}
        openAccordions={[]}
        onToggle={onToggle}
      />,
    );

    await user.click(screen.getByText("훅"));

    expect(onToggle).toHaveBeenCalledWith("hooks");
  });
});
