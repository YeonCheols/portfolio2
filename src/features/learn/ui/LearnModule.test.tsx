import { render, screen } from "@testing-library/react";

import LearnModule from "@/features/learn/ui/LearnModule";
import { ContentProps } from "@/shared/types/learn";

jest.mock("@/features/learn/ui/LearnCard", () => {
  const LearnCard = ({ title }: { title: string }) => (
    <article>{title}</article>
  );
  return LearnCard;
});

const content = (id: number, title: string): ContentProps => ({
  id,
  title,
  slug: title.toLowerCase(),
  description: "",
  image: "",
  is_new: false,
  level: "Beginner",
  is_show: true,
});

describe("LearnModule", () => {
  it("콘텐츠가 있으면 각 제목을 보여 준다", () => {
    render(
      <LearnModule
        contents={[content(1, "React"), content(2, "TypeScript")]}
      />,
    );

    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
  });

  it("콘텐츠가 없으면 제목을 보여 주지 않는다", () => {
    const { container } = render(<LearnModule contents={[]} />);

    expect(container.querySelector("article")).not.toBeInTheDocument();
  });
});
