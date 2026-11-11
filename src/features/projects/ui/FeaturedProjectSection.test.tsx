import { render, screen } from "@testing-library/react";

import FeaturedProjectSection from "./FeaturedProjectSection";

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt, src }: { alt: string; src: string }) => (
    <div role="img" aria-label={alt} data-src={src} />
  ),
}));

describe("FeaturedProjectSection", () => {
  it("홈에는 대표 프로젝트명과 썸네일, 요약 및 상세 이동만 보여 준다", () => {
    render(<FeaturedProjectSection />);

    expect(
      screen.getByRole("heading", { name: "대표 프로젝트" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "알바몬 서비스 MSA 전환 및 React 마이그레이션",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "알바몬 서비스의 모듈형 전환을 표현한 MSA 썸네일",
      }),
    ).toHaveAttribute("data-src", "/images/featured/albamon-msa.png");
    expect(
      screen.getByText(/알바몬 서비스 전체를 MSA 구조로 고도화/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "상세 내용 보기" }),
    ).toHaveAttribute("href", "/projects/albamon-msa");
    expect(screen.getByText("View Project")).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "알바몬 서비스 MSA 전환 및 React 마이그레이션 상세 보기",
      }),
    ).toHaveAttribute("href", "/projects/albamon-msa");
    expect(
      screen.queryByText(/포트폴리오, 경력사항, 공개 설정/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/기획·백엔드 등 타 부서/),
    ).not.toBeInTheDocument();
  });
});
