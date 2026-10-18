import axios from "axios";

import { fetcher } from "@/shared/api/fetcher";

jest.mock("axios");

const mockedGet = axios.get as jest.MockedFunction<typeof axios.get>;

describe("fetcher", () => {
  it("응답 본문만 반환한다", async () => {
    mockedGet.mockResolvedValue({ data: { ok: true } });

    await expect(fetcher("/api/stacks")).resolves.toEqual({ ok: true });
    expect(mockedGet).toHaveBeenCalledWith("/api/stacks");
  });
});
