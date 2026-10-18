import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";

import ContactForm from "@/features/contact/ui/ContactForm";

jest.mock("axios");

const mockedPost = axios.post as jest.MockedFunction<typeof axios.post>;

describe("ContactForm", () => {
  beforeEach(() => {
    mockedPost.mockReset();
    jest.spyOn(window, "alert").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("빈 값으로 제출하면 요청을 보내지 않는다", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    expect(screen.getByPlaceholderText("제목을 입력해주세요")).toBeRequired();
    expect(screen.getByPlaceholderText("내용을 입력해주세요")).toBeRequired();
    expect(screen.getByText("Avg. response:")).toBeInTheDocument();
    expect(screen.getByText(/1-2 Hours/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "메일 발송하기" }));

    expect(mockedPost).not.toHaveBeenCalled();
  });

  it("입력했다가 비우면 제출 버튼을 비활성화하고 제출 시 에러 알림을 띄운다", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);
    const subject = screen.getByPlaceholderText("제목을 입력해주세요");

    await user.type(subject, "가");
    await user.clear(subject);

    expect(
      screen.getByRole("button", { name: "메일 발송하기" }),
    ).toBeDisabled();

    fireEvent.submit(subject.closest("form") as HTMLFormElement);

    expect(window.alert).toHaveBeenCalledWith("Error!");
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it("제출에 성공하면 발송 알림을 띄우고 입력값을 비운다", async () => {
    const user = userEvent.setup();
    mockedPost.mockResolvedValue({ status: 200 });
    render(<ContactForm />);

    await user.type(screen.getByPlaceholderText("제목을 입력해주세요"), "안녕");
    await user.type(screen.getByPlaceholderText("내용을 입력해주세요"), "내용");
    await user.click(screen.getByRole("button", { name: "메일 발송하기" }));

    expect(mockedPost).toHaveBeenCalledWith("/api/contact", {
      formData: { subject: "안녕", content: "내용" },
    });
    expect(window.alert).toHaveBeenCalledWith("메시지가 발송되었습니다.");
    expect(screen.getByPlaceholderText("제목을 입력해주세요")).toHaveValue("");
    expect(screen.getByPlaceholderText("내용을 입력해주세요")).toHaveValue("");
  });

  it("제출이 실패하면 에러를 알린다", async () => {
    const user = userEvent.setup();
    const error = new Error("network");
    mockedPost.mockRejectedValue(error);
    render(<ContactForm />);

    await user.type(screen.getByPlaceholderText("제목을 입력해주세요"), "안녕");
    await user.type(screen.getByPlaceholderText("내용을 입력해주세요"), "내용");
    await user.click(screen.getByRole("button", { name: "메일 발송하기" }));

    expect(window.alert).toHaveBeenCalledWith(error);
    expect(
      screen.getByRole("button", { name: "메일 발송하기" }),
    ).toBeInTheDocument();
  });
});
