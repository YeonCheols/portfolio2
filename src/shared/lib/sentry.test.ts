import * as Sentry from "@sentry/nextjs";
import type { ErrorInfo } from "react";

import {
  captureError,
  captureEvent,
  captureMessage,
  handleApiError,
  handleReactError,
  setContext,
  setTag,
  setUser,
  startTransaction,
} from "@/shared/lib/sentry";

jest.mock("@sentry/nextjs", () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  setContext: jest.fn(),
  captureEvent: jest.fn(),
}));

const captureException = Sentry.captureException as jest.Mock;
const captureSentryMessage = Sentry.captureMessage as jest.Mock;

describe("sentry", () => {
  const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    errorSpy.mockRestore();
  });

  it("에러를 넘기면 captureException으로 전달한다", () => {
    const error = new Error("실패");

    captureError(error, { endpoint: "/api/posts" });

    expect(captureException).toHaveBeenCalledWith(error, {
      contexts: { custom: { endpoint: "/api/posts" } },
    });
  });

  it("컨텍스트가 없으면 contexts를 비워 전달한다", () => {
    const error = new Error("실패");

    captureError(error);

    expect(captureException).toHaveBeenCalledWith(error, {
      contexts: undefined,
    });
  });

  it("captureException이 실패하면 예외를 삼킨다", () => {
    const error = new Error("실패");
    const sentryError = new Error("sentry down");
    captureException.mockImplementation(() => {
      throw sentryError;
    });

    expect(() => captureError(error)).not.toThrow();
    expect(errorSpy).toHaveBeenCalledWith(
      "Sentry.captureException failed:",
      sentryError,
    );
  });

  it("메시지를 넘기면 기본 레벨 error로 전달한다", () => {
    captureMessage("서버 오류");

    expect(captureSentryMessage).toHaveBeenCalledWith("서버 오류", "error");
  });

  it("레벨을 지정하면 그 레벨로 메시지를 전달한다", () => {
    captureMessage("안내", "info");

    expect(captureSentryMessage).toHaveBeenCalledWith("안내", "info");
  });

  it("captureMessage가 실패하면 예외를 삼킨다", () => {
    const sentryError = new Error("sentry down");
    captureSentryMessage.mockImplementation(() => {
      throw sentryError;
    });

    expect(() => captureMessage("서버 오류")).not.toThrow();
    expect(errorSpy).toHaveBeenCalledWith(
      "Sentry.captureMessage failed:",
      sentryError,
    );
  });

  it("사용자를 넘기면 setUser로 전달한다", () => {
    const user = { id: "1", email: "a@b.c", username: "yc" };

    setUser(user);

    expect(Sentry.setUser).toHaveBeenCalledWith(user);
  });

  it("태그를 넘기면 setTag로 전달한다", () => {
    setTag("page", "blog");

    expect(Sentry.setTag).toHaveBeenCalledWith("page", "blog");
  });

  it("컨텍스트를 넘기면 setContext로 전달한다", () => {
    setContext("device", { os: "mac" });

    expect(Sentry.setContext).toHaveBeenCalledWith("device", { os: "mac" });
  });

  it("트랜잭션을 시작하면 null을 반환한다", () => {
    expect(startTransaction("load", "http")).toBeNull();
  });

  it("이벤트를 넘기면 captureEvent로 전달한다", () => {
    const event = { message: "custom" };

    captureEvent(event);

    expect(Sentry.captureEvent).toHaveBeenCalledWith(event);
  });

  it("Error가 아닌 API 오류면 Error로 감싸 전달한다", () => {
    handleApiError("boom", "/api/mail");

    expect(captureException).toHaveBeenCalledWith(expect.any(Error), {
      contexts: {
        custom: { endpoint: "/api/mail", type: "api_error" },
      },
    });
    expect(captureException.mock.calls[0][0].message).toBe("boom");
  });

  it("리액트 오류면 componentStack을 함께 전달한다", () => {
    const error = new Error("render");
    const info = { componentStack: "\n    at Card" } as ErrorInfo;

    handleReactError(error, info);

    expect(captureException).toHaveBeenCalledWith(error, {
      contexts: {
        custom: {
          componentStack: "\n    at Card",
          type: "react_error",
        },
      },
    });
  });
});
