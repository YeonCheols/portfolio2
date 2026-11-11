import { render, screen, within } from "@testing-library/react";

import FeaturedProjectDetail from "./FeaturedProjectDetail";

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt, src }: { alt: string; src: string }) => (
    <div role="img" aria-label={alt} data-src={src} />
  ),
}));

describe("FeaturedProjectDetail", () => {
  it("목차를 따라 배경부터 문제 해결과 결과까지 읽을 수 있다", () => {
    render(<FeaturedProjectDetail />);

    expect(
      screen.getByRole("img", {
        name: "알바몬 서비스의 모듈형 전환을 표현한 MSA 썸네일",
      }),
    ).toHaveAttribute("data-src", "/images/featured/albamon-msa.png");
    const tableOfContents = screen.getByRole("navigation", {
      name: "프로젝트 목차",
    });

    expect(
      within(tableOfContents).getByRole("link", { name: /배경과 목표$/ }),
    ).toHaveAttribute("href", "#background");
    expect(
      within(tableOfContents).getByRole("link", {
        name: /이력서와 지원자 흐름을 React로 옮기다$/,
      }),
    ).toHaveAttribute("href", "#workflows");
    expect(
      within(tableOfContents).getByRole("link", {
        name: /서비스 경계에서 만난 파일과 스킬 데이터$/,
      }),
    ).toHaveAttribute("href", "#boundaries");
    expect(
      within(tableOfContents).getByRole("link", {
        name: /개발 검증과 통합 테스트$/,
      }),
    ).toHaveAttribute("href", "#quality");
    expect(
      within(tableOfContents).getByRole("link", { name: /결과와 회고$/ }),
    ).toHaveAttribute("href", "#outcomes");
    expect(
      within(tableOfContents).getByRole("link", {
        name: /MSA 전환 이후 안정화와 운영$/,
      }),
    ).toHaveAttribute("href", "#stabilization");
    const sectionLinks = within(tableOfContents).getAllByRole("link");
    const stabilizationIndex = sectionLinks.findIndex((link) =>
      link.textContent?.includes("MSA 전환 이후 안정화와 운영"),
    );
    const outcomesIndex = sectionLinks.findIndex((link) =>
      link.textContent?.includes("결과와 회고"),
    );

    expect(stabilizationIndex).toBeLessThan(outcomesIndex);

    expect(
      screen.getByRole("heading", { name: "배경과 목표" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/알바몬 MSA 구축은 기존 서비스를 새 구조로 옮기면서/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/외주 개발자를 포함해 약 100명의 개발자가 참여/),
    ).toBeInTheDocument();
    const technologyStack = screen.getByRole("list", {
      name: "기술 스택",
    });
    expect(
      within(technologyStack).getByText("Next.js 12.2.2"),
    ).toBeInTheDocument();
    expect(within(technologyStack).getByText("Zustand 5")).toBeInTheDocument();
    expect(
      within(technologyStack).getByText("Datadog RUM"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/포트폴리오, 경력, 공개 설정, 학력, 자기소개서/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /지원자 상태별 카드와 목록을 두고 보류·승인·대기 처리를/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Zustand로 스킬 데이터를 캐싱하고 상태를 공유/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "MSA 전환 이후 안정화와 운영",
      }),
    ).toHaveAttribute("id", "stabilization-heading");
    const stabilizationSection = screen.getByRole("region", {
      name: "MSA 전환 이후 안정화와 운영",
    });
    expect(
      within(stabilizationSection).getByRole("link", {
        name: "기존 알바몬 프로젝트 상세의 역할 소개",
      }),
    ).toHaveAttribute("href", "/projects/albamon#41-역할-비즈니스-관점");
    expect(
      screen.getByText(
        /통합 테스트를 마치고 새 서비스를 오픈한 뒤에도 확인할 일이 남았습니다/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/약 100명의 개발자와 기획·디자인이 각 영역을 맡아 협업/),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/엣지 케이스와 검수 오류/)).toHaveLength(2);
  });
});
