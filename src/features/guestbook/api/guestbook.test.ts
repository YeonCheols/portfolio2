import axios from "axios";

import {
  createGuestbookComment,
  createGuestbookEntry,
  getGuestbookComments,
  getGuestbookEntries,
} from "@/features/guestbook/api/guestbook";

jest.mock("axios");

const mockedGet = axios.get as jest.MockedFunction<typeof axios.get>;
const mockedPost = axios.post as jest.MockedFunction<typeof axios.post>;

describe("guestbook api", () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedPost.mockReset();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("방명록 목록을 반환한다", async () => {
    const entries = [
      {
        id: "g1",
        name: "연철",
        message: "안녕",
        createdAt: "2024-01-01T00:00:00.000Z",
      },
    ];
    mockedGet.mockResolvedValue({ data: { success: true, data: entries } });

    await expect(getGuestbookEntries()).resolves.toEqual(entries);
    expect(mockedGet).toHaveBeenCalledWith("/api/guestbook");
  });

  it("방명록 데이터가 없으면 빈 배열을 반환한다", async () => {
    mockedGet.mockResolvedValue({ data: { success: true } });

    await expect(getGuestbookEntries()).resolves.toEqual([]);
  });

  it("방명록 조회가 실패하면 빈 배열을 반환한다", async () => {
    mockedGet.mockRejectedValue(new Error("network"));

    await expect(getGuestbookEntries()).resolves.toEqual([]);
  });

  it("방명록 작성에 성공하면 true를 반환한다", async () => {
    const entry = { name: "연철", message: "안녕" };
    mockedPost.mockResolvedValue({ data: { success: true } });

    await expect(createGuestbookEntry(entry)).resolves.toBe(true);
    expect(mockedPost).toHaveBeenCalledWith("/api/guestbook", entry, {
      headers: { "Content-Type": "application/json" },
    });
  });

  it("방명록 작성 응답이 실패면 false를 반환한다", async () => {
    mockedPost.mockResolvedValue({ data: { success: false } });

    await expect(
      createGuestbookEntry({ name: "연철", message: "안녕" }),
    ).resolves.toBe(false);
  });

  it("방명록 작성이 실패하면 false를 반환한다", async () => {
    mockedPost.mockRejectedValue(new Error("network"));

    await expect(
      createGuestbookEntry({ name: "연철", message: "안녕" }),
    ).resolves.toBe(false);
  });

  it("댓글 목록을 반환한다", async () => {
    const comments = [
      {
        id: "c1",
        guestbookId: "g1",
        name: "연철",
        message: "댓글",
        createdAt: "2024-01-02T00:00:00.000Z",
      },
    ];
    mockedGet.mockResolvedValue({ data: { success: true, data: comments } });

    await expect(getGuestbookComments("g1")).resolves.toEqual(comments);
    expect(mockedGet).toHaveBeenCalledWith("/api/guestbook/g1/comments");
  });

  it("댓글 조회가 실패하면 빈 배열을 반환한다", async () => {
    mockedGet.mockRejectedValue(new Error("network"));

    await expect(getGuestbookComments("g1")).resolves.toEqual([]);
  });

  it("댓글 작성에 성공하면 true를 반환한다", async () => {
    const comment = { guestbookId: "g1", name: "연철", message: "댓글" };
    mockedPost.mockResolvedValue({ data: { success: true } });

    await expect(createGuestbookComment(comment)).resolves.toBe(true);
    expect(mockedPost).toHaveBeenCalledWith(
      "/api/guestbook/g1/comments",
      comment,
      { headers: { "Content-Type": "application/json" } },
    );
  });

  it("댓글 작성이 실패하면 false를 반환한다", async () => {
    mockedPost.mockRejectedValue(new Error("network"));

    await expect(
      createGuestbookComment({
        guestbookId: "g1",
        name: "연철",
        message: "댓글",
      }),
    ).resolves.toBe(false);
  });
});
