import * as Sentry from "@sentry/nextjs";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import SentryErrorBoundary from "@/shared/ui/SentryErrorBoundary";

jest.mock("@sentry/nextjs", () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  setContext: jest.fn(),
  captureEvent: jest.fn(),
}));

const Problem = ({ message }: { message: string }) => {
  throw new Error(message);
};

describe("SentryErrorBoundary", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.mocked(Sentry.captureException).mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("자식이 정상이면 자식을 보여 준다", () => {
    render(
      <SentryErrorBoundary>
        <p>정상 내용</p>
      </SentryErrorBoundary>,
    );

    expect(screen.getByText("정상 내용")).toBeInTheDocument();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("자식이 던지면 기본 안내를 보여 주고 센트리에 보낸다", () => {
    render(
      <SentryErrorBoundary>
        <Problem message="깨짐" />
      </SentryErrorBoundary>,
    );

    expect(
      screen.getByRole("heading", { name: "Something went wrong" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("We've been notified and are working to fix the issue."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: "깨짐" }),
      expect.objectContaining({
        contexts: {
          react: expect.objectContaining({
            componentStack: expect.any(String),
          }),
        },
      }),
    );
  });

  it("폴백을 넘기면 그 폴백을 보여 준다", () => {
    const Fallback = ({ error }: { error: Error }) => (
      <p>폴백 {error.message}</p>
    );

    render(
      <SentryErrorBoundary fallback={Fallback}>
        <Problem message="깨짐" />
      </SentryErrorBoundary>,
    );

    expect(screen.getByText("폴백 깨짐")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Something went wrong" }),
    ).not.toBeInTheDocument();
  });

  it("다시 시도를 누르면 자식을 다시 보여 준다", async () => {
    const user = userEvent.setup();
    let shouldThrow = true;
    const Flaky = () => {
      if (shouldThrow) {
        throw new Error("깨짐");
      }
      return <p>복구됨</p>;
    };

    render(
      <SentryErrorBoundary>
        <Flaky />
      </SentryErrorBoundary>,
    );

    shouldThrow = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(screen.getByText("복구됨")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Something went wrong" }),
    ).not.toBeInTheDocument();
  });
});
