import { render, renderHook, waitFor } from "@testing-library/react";
import { ReactNode } from "react";
import { SWRConfig } from "swr";

import { fetcher } from "@/shared/api/fetcher";
import { useStacks } from "@/shared/hooks/useStacks";

jest.mock("@/shared/api/fetcher", () => ({
  fetcher: jest.fn(),
}));

jest.mock("@yeoncheols/portfolio-core-ui", () => ({
  getIconComponent: (icon: string) => {
    if (icon !== "SiReact") {
      return null;
    }

    return ({
      size,
      className,
      title,
    }: {
      size?: number;
      className?: string;
      title?: string;
    }) => (
      <svg className={className} width={size} height={size}>
        <title>{title}</title>
      </svg>
    );
  },
}));

const mockedFetcher = fetcher as jest.Mock;

const wrapper = ({ children }: { children: ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
);

const stack = (name: string, icon: string, color: string) => ({
  id: 1,
  name,
  icon,
  color,
  category: "frontend" as const,
  projectCount: 1,
  updatedAt: "2024-01-01T00:00:00.000Z",
});

describe("useStacks", () => {
  beforeEach(() => {
    mockedFetcher.mockReset();
  });

  it("요청 중이면 로딩 상태이고 아이콘은 비어 있다", async () => {
    mockedFetcher.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useStacks(), { wrapper });

    await waitFor(() => {
      expect(result.current.isStacksLoading).toBe(true);
    });
    expect(result.current.StackIcons).toEqual({});
    expect(result.current.stacksData).toBeUndefined();
    expect(mockedFetcher).toHaveBeenCalledWith("/api/stacks");
  });

  it("스택 응답에 data 배열이 없으면 빈 아이콘 목록을 반환한다", async () => {
    mockedFetcher.mockResolvedValue({
      status: false,
      error: "API_URL is not configured",
    });
    const { result } = renderHook(() => useStacks(), { wrapper });

    await waitFor(() => {
      expect(result.current.isStacksLoading).toBe(false);
    });
    expect(result.current.StackIcons).toEqual({});
  });

  it("스택이 없으면 빈 아이콘 목록을 반환한다", async () => {
    mockedFetcher.mockResolvedValue({
      data: [],
      total: 0,
      allTotal: 0,
      page: 1,
      size: 10,
    });
    const { result } = renderHook(() => useStacks(), { wrapper });

    await waitFor(() => {
      expect(result.current.isStacksLoading).toBe(false);
    });
    expect(result.current.StackIcons).toEqual({});
  });

  it("아이콘이 있는 스택만 크기와 색을 넣어 만들고 없는 아이콘은 건너뛴다", async () => {
    mockedFetcher.mockResolvedValue({
      data: [
        stack("React", "SiReact", "text-sky-500"),
        stack("Unknown", "nope", "text-red-500"),
      ],
      total: 2,
      allTotal: 2,
      page: 1,
      size: 10,
    });
    const { result } = renderHook(() => useStacks(32), { wrapper });

    await waitFor(() => {
      expect(result.current.StackIcons.React).toBeDefined();
    });

    expect(Object.keys(result.current.StackIcons)).toEqual(["React"]);

    const { container } = render(result.current.StackIcons.React);
    const icon = container.querySelector("svg");

    expect(icon).toHaveClass("text-sky-500");
    expect(icon).toHaveAttribute("width", "32");
    expect(icon).toHaveAttribute("height", "32");
    expect(container.querySelector("title")).toHaveTextContent("React");
  });

  it("크기를 생략하면 아이콘 크기를 20으로 둔다", async () => {
    mockedFetcher.mockResolvedValue({
      data: [stack("React", "SiReact", "text-sky-500")],
      total: 1,
      allTotal: 1,
      page: 1,
      size: 10,
    });
    const { result } = renderHook(() => useStacks(), { wrapper });

    await waitFor(() => {
      expect(result.current.StackIcons.React).toBeDefined();
    });

    const { container } = render(result.current.StackIcons.React);
    expect(container.querySelector("svg")).toHaveAttribute("width", "20");
    expect(container.querySelector("svg")).toHaveAttribute("height", "20");
  });
});
