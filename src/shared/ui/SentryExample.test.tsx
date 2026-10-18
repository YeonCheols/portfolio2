import * as Sentry from "@sentry/nextjs";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import SentryExample from "@/shared/ui/SentryExample";

jest.mock("@sentry/nextjs", () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  setContext: jest.fn(),
  captureEvent: jest.fn(),
}));

describe("SentryExample", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("렌더하면 테스트 도구와 버튼을 보여 준다", () => {
    render(<SentryExample />);

    expect(
      screen.getByRole("heading", { name: "Sentry 테스트 도구" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "에러 발생 테스트" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "메시지 캡처 테스트" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "사용자 정보 설정" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "태그 설정" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "API 에러 시뮬레이션" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "성능 모니터링 테스트" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("각 버튼을 클릭하면 Sentry에 해당 이벤트가 전송됩니다."),
    ).toBeInTheDocument();
  });

  it("에러 발생을 누르면 예외를 보낸다", async () => {
    const user = userEvent.setup();
    render(<SentryExample />);

    await user.click(screen.getByRole("button", { name: "에러 발생 테스트" }));

    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: "This is a test error for Sentry" }),
      {
        contexts: {
          custom: {
            component: "SentryExample",
            action: "test_error",
          },
        },
      },
    );
  });

  it("메시지 캡처를 누르면 메시지를 보낸다", async () => {
    const user = userEvent.setup();
    render(<SentryExample />);

    await user.click(
      screen.getByRole("button", { name: "메시지 캡처 테스트" }),
    );

    expect(Sentry.captureMessage).toHaveBeenNthCalledWith(
      1,
      "Error level test message",
      "error",
    );
    expect(Sentry.captureMessage).toHaveBeenNthCalledWith(
      2,
      "Warning level test message",
      "warning",
    );
    expect(Sentry.captureMessage).toHaveBeenNthCalledWith(
      3,
      "Info level test message",
      "info",
    );
    expect(Sentry.captureMessage).toHaveBeenNthCalledWith(
      4,
      "Default error level message",
      "error",
    );
  });

  it("사용자 설정을 누르면 사용자와 메시지를 보낸다", async () => {
    const user = userEvent.setup();
    render(<SentryExample />);

    await user.click(screen.getByRole("button", { name: "사용자 정보 설정" }));

    expect(Sentry.setUser).toHaveBeenCalledWith({
      id: "ycseng",
      email: "s929290@gmail.com",
      username: "ycseng",
    });
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      "User information set",
      "info",
    );
  });

  it("태그 설정을 누르면 태그와 메시지를 보낸다", async () => {
    const user = userEvent.setup();
    render(<SentryExample />);

    await user.click(screen.getByRole("button", { name: "태그 설정" }));

    expect(Sentry.setTag).toHaveBeenCalledWith("feature", "sentry-test");
    expect(Sentry.setTag).toHaveBeenCalledWith(
      "environment",
      process.env.NODE_ENV || "development",
    );
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      "Tags set successfully",
      "info",
    );
  });

  it("API 에러를 누르면 API 예외를 보낸다", async () => {
    const user = userEvent.setup();
    render(<SentryExample />);

    await user.click(
      screen.getByRole("button", { name: "API 에러 시뮬레이션" }),
    );

    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: "API request failed" }),
      {
        contexts: {
          custom: {
            endpoint: "/api/test",
            type: "api_error",
          },
        },
      },
    );
  });

  it("성능 모니터링을 누르면 시작과 완료 메시지를 보낸다", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<SentryExample />);

    await user.click(
      screen.getByRole("button", { name: "성능 모니터링 테스트" }),
    );

    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      "Performance test started",
      "error",
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      "Performance test completed",
      "error",
    );
    jest.useRealTimers();
  });
});
