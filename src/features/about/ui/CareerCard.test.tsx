import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { differenceInMonths, differenceInYears, format } from "date-fns";

import CareerCard from "@/features/about/ui/CareerCard";
import { CareerProps } from "@/shared/types/careers";

jest.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    ul: ({ children }: { children: React.ReactNode }) => <ul>{children}</ul>,
    li: ({ children }: { children: React.ReactNode }) => <li>{children}</li>,
  },
}));

const career: CareerProps = {
  position: "프론트엔드 개발자",
  company: "잡코리아",
  logo: null,
  location: "교대역 인근",
  type: "정규직",
  start_date: "2022-10",
  end_date: "2026-04",
  industry: "채용 서비스",
  link: "https://m.albamon.com/",
  responsibilities: ["알바몬 개발", "비즈센터 담당"],
};

describe("CareerCard", () => {
  it("회사 링크와 근무 기간을 보여 준다", () => {
    render(<CareerCard {...career} />);

    const start = format(new Date(career.start_date), "MMM yyyy");
    const end = format(new Date(career.end_date as string), "MMM yyyy");
    const years = differenceInYears(
      new Date(career.end_date as string),
      new Date(career.start_date),
    );
    const months =
      (differenceInMonths(
        new Date(career.end_date as string),
        new Date(career.start_date),
      ) %
        12) +
      1;
    const duration = `${years > 0 ? `${years} Year${years > 1 ? "s" : ""}, ` : ""}${months} Month${months > 1 ? "s" : ""}`;

    expect(
      screen.getByRole("heading", { name: "프론트엔드 개발자" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "잡코리아" })).toHaveAttribute(
      "href",
      "https://m.albamon.com/",
    );
    expect(screen.getByText("교대역 인근")).toBeInTheDocument();
    expect(screen.getByText(`${start} - ${end}`)).toBeInTheDocument();
    expect(screen.getByText(duration)).toBeInTheDocument();
    expect(screen.getByText("정규직")).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: "잡코리아" }),
    ).not.toBeInTheDocument();
  });

  it("종료일이 없으면 Present를 보여 준다", () => {
    const now = new Date("2026-04-15T00:00:00.000Z");
    jest.useFakeTimers();
    jest.setSystemTime(now);

    render(<CareerCard {...career} end_date={null} />);

    const years = differenceInYears(now, new Date(career.start_date));
    const months =
      (differenceInMonths(now, new Date(career.start_date)) % 12) + 1;
    const duration = `${years > 0 ? `${years} Year${years > 1 ? "s" : ""}, ` : ""}${months} Month${months > 1 ? "s" : ""}`;

    expect(screen.getByText(/Present/)).toBeInTheDocument();
    expect(screen.getByText(duration)).toBeInTheDocument();

    jest.useRealTimers();
  });

  it("담당업무를 누르면 목록을 보여 주고 다시 누르면 숨긴다", async () => {
    const user = userEvent.setup();
    render(<CareerCard {...career} />);

    expect(screen.queryByText("알바몬 개발")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "담당업무" }));
    expect(screen.getByText("알바몬 개발")).toBeInTheDocument();
    expect(screen.getByText("비즈센터 담당")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "담당업무" }));
    expect(screen.queryByText("알바몬 개발")).not.toBeInTheDocument();
  });

  it("로고가 있으면 회사 이미지를 보여 준다", () => {
    render(<CareerCard {...career} logo="/images/jobkorea.png" />);

    expect(screen.getByRole("img", { name: "잡코리아" })).toBeInTheDocument();
  });

  it("링크가 없으면 # 주소로 연결한다", () => {
    render(<CareerCard {...career} link={null} />);

    expect(screen.getByRole("link", { name: "잡코리아" })).toHaveAttribute(
      "href",
      "#",
    );
  });
});
