import { render, screen } from "@testing-library/react";
import { useRouter } from "next/router";

import Layout from "@/widgets/layout/ui/Layout";

jest.mock("next/router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/widgets/layout/ui/header/HeaderSidebar", () => {
  const HeaderSidebar = () => <nav>사이드바</nav>;
  return HeaderSidebar;
});
jest.mock("@/widgets/layout/ui/header/HeaderTop", () => {
  const HeaderTop = () => <div>상단 헤더</div>;
  return HeaderTop;
});
jest.mock("@/features/chat/ui/ChatButton", () => {
  const ChatButton = () => <button type="button">채팅</button>;
  return ChatButton;
});

const mockedUseRouter = useRouter as jest.Mock;

describe("Layout", () => {
  it("일반 페이지면 사이드바와 본문과 채팅을 보여 준다", () => {
    mockedUseRouter.mockReturnValue({ pathname: "/about" });

    render(
      <Layout>
        <p>본문</p>
      </Layout>,
    );

    expect(screen.getByText("사이드바")).toBeInTheDocument();
    expect(screen.getByText("본문")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "채팅" })).toBeInTheDocument();
    expect(screen.queryByText("상단 헤더")).not.toBeInTheDocument();
  });

  it("블로그 경로면 상단 헤더와 본문을 보여 준다", () => {
    mockedUseRouter.mockReturnValue({ pathname: "/blog/[slug]" });

    render(
      <Layout>
        <p>글 본문</p>
      </Layout>,
    );

    expect(screen.getByText("상단 헤더")).toBeInTheDocument();
    expect(screen.getByText("글 본문")).toBeInTheDocument();
    expect(screen.queryByText("사이드바")).not.toBeInTheDocument();
  });

  it("학습 상세 경로면 상단 헤더를 보여 준다", () => {
    mockedUseRouter.mockReturnValue({ pathname: "/learn/[slug]" });

    render(
      <Layout>
        <p>학습</p>
      </Layout>,
    );

    expect(screen.getByText("상단 헤더")).toBeInTheDocument();
    expect(screen.queryByText("사이드바")).not.toBeInTheDocument();
  });

  it("플레이그라운드 경로면 상단 헤더를 보여 준다", () => {
    mockedUseRouter.mockReturnValue({ pathname: "/playground" });

    render(
      <Layout>
        <p>놀이터</p>
      </Layout>,
    );

    expect(screen.getByText("상단 헤더")).toBeInTheDocument();
    expect(screen.getByText("놀이터")).toBeInTheDocument();
    expect(screen.queryByText("사이드바")).not.toBeInTheDocument();
  });
});
