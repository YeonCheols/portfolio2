import { fireEvent, render, screen } from "@testing-library/react";

import { CommandPaletteProvider } from "@/features/cmdpallete/model/CommandPaletteContext";
import CommandPalette from "@/features/cmdpallete/ui/CommandPalette";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock;

jest.mock("@/features/cmdpallete/ui/AiResponses", () => {
  const AiResponses = () => <div>AI 응답</div>;
  return AiResponses;
});
jest.mock("@/features/cmdpallete/ui/QueryNotFound", () => {
  const QueryNotFound = () => <div>결과 없음</div>;
  return QueryNotFound;
});
jest.mock("@/features/cmdpallete/ui/AiLoading", () => {
  const AiLoading = () => <div>로딩</div>;
  return AiLoading;
});
jest.mock("next/router", () => ({
  useRouter: () => ({ pathname: "/", push: jest.fn() }),
}));
jest.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark", setTheme: jest.fn() }),
}));
jest.mock("@/shared/hooks/useIsMobile", () => () => false);
jest.mock("@/features/cmdpallete/api/sendMessage", () => ({
  sendMessage: jest.fn(),
}));

describe("CommandPalette", () => {
  it("Cmd+K를 누르면 검색 입력을 보여 준다", () => {
    render(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>,
    );

    fireEvent.keyDown(window, { key: "k", metaKey: true });

    expect(
      screen.getByPlaceholderText("Search or Ask anything..."),
    ).toBeInTheDocument();
  });
});
