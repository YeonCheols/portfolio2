import { render, screen } from "@testing-library/react";
import useSWR from "swr";

import LearnCard from "@/features/learn/ui/LearnCard";
import { ContentProps } from "@/shared/types/learn";

jest.mock("swr", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockedUseSWR = useSWR as jest.Mock;

const content: ContentProps = {
  id: 1,
  title: "React",
  slug: "react",
  description: "리액트 학습",
  image: "/images/react.png",
  is_new: true,
  level: "Beginner",
  is_show: true,
};

describe("LearnCard", () => {
  it("학습 카드 링크와 레슨 수를 보여 준다", () => {
    mockedUseSWR.mockReturnValue({ data: { count: 3 } });

    render(<LearnCard {...content} />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/learn/react");
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("리액트 학습")).toBeInTheDocument();
    expect(screen.getByText("3 Lessons")).toBeInTheDocument();
    expect(screen.getByText("Beginner")).toBeInTheDocument();
    expect(screen.getByText("New")).toBeInTheDocument();
    expect(screen.getByText("View Lessons")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "React" })).toBeInTheDocument();
  });

  it("레슨이 하나면 Lesson이라고 보여 준다", () => {
    mockedUseSWR.mockReturnValue({ data: { count: 1 } });

    render(<LearnCard {...content} is_new={false} />);

    expect(screen.getByText("1 Lesson")).toBeInTheDocument();
    expect(screen.queryByText("New")).not.toBeInTheDocument();
  });

  it("레슨 수를 못 받으면 0 Lesson을 보여 준다", () => {
    mockedUseSWR.mockReturnValue({ data: undefined });

    render(<LearnCard {...content} is_new={false} />);

    expect(screen.getByText("0 Lesson")).toBeInTheDocument();
  });
});
