import { vi } from "vitest";

// jsdom은 레이아웃이 없어 차트 컨테이너가 너비 0으로 측정된다. 관찰 시작 때 고정 크기를 알려 차트가 그려지게 한다
export const stubChartSize = (width = 640, height = 320) => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(private readonly callback: ResizeObserverCallback) {}
      observe(target: Element) {
        this.callback(
          [
            {
              target,
              contentRect: { width, height },
            } as unknown as ResizeObserverEntry,
          ],
          this as unknown as ResizeObserver,
        );
      }
      unobserve() {}
      disconnect() {}
    },
  );
};
