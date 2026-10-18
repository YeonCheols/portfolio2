import type { AxiosStatic } from "axios";

jest.mock("axios");

const BASIC_TOKEN = Buffer.from("client-id:client-secret").toString("base64");

const originalEnv = {
  SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REFRESH_TOKEN: process.env.SPOTIFY_REFRESH_TOKEN,
};

const restoreEnv = (key: keyof typeof originalEnv) => {
  const value = originalEnv[key];
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
};

const loadSpotify = async () => {
  jest.resetModules();
  process.env.SPOTIFY_CLIENT_ID = "client-id";
  process.env.SPOTIFY_CLIENT_SECRET = "client-secret";
  process.env.SPOTIFY_REFRESH_TOKEN = "refresh-token";

  const axiosModule = await import("axios");
  const client = axiosModule.default as AxiosStatic;
  const spotify = await import("@/shared/api/spotify");

  return { client, spotify };
};

const mockToken = (client: AxiosStatic) => {
  (client.post as jest.Mock).mockResolvedValue({
    data: { access_token: "access-token" },
  });
};

describe("spotify", () => {
  afterAll(() => {
    restoreEnv("SPOTIFY_CLIENT_ID");
    restoreEnv("SPOTIFY_CLIENT_SECRET");
    restoreEnv("SPOTIFY_REFRESH_TOKEN");
  });

  it("기기 목록을 조회하면 가져올 당시의 토큰으로 요청하고 모델을 매핑한다", async () => {
    const { client, spotify } = await loadSpotify();
    mockToken(client);
    process.env.SPOTIFY_CLIENT_ID = "changed-id";
    process.env.SPOTIFY_REFRESH_TOKEN = "changed-refresh";
    (client.get as jest.Mock).mockResolvedValue({
      status: 200,
      data: {
        devices: [
          {
            name: "Work",
            is_active: true,
            type: "Computer",
            id: "spotify-id",
          },
          {
            name: "Desk",
            is_active: false,
            type: "Car",
            id: "other",
          },
        ],
      },
    });

    await expect(spotify.getAvailableDevices()).resolves.toEqual({
      status: 200,
      data: [
        {
          name: "Work",
          is_active: true,
          type: "Computer",
          model: "MacBook Pro M1",
          id: "aulianza-mac",
        },
        {
          name: "Desk",
          is_active: false,
          type: "Car",
          model: "Unknown Device",
          id: "aulianza-device",
        },
      ],
    });
    expect(client.post).toHaveBeenCalledWith(
      "https://accounts.spotify.com/api/token",
      "grant_type=refresh_token&refresh_token=refresh-token",
      {
        headers: {
          Authorization: `Basic ${BASIC_TOKEN}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );
    expect(client.get).toHaveBeenCalledWith(
      "https://api.spotify.com/v1/me/player/devices",
      { headers: { Authorization: "Bearer access-token" } },
    );
  });

  it("기기 상태 코드가 204이거나 400을 넘으면 빈 배열을 반환한다", async () => {
    const { client, spotify } = await loadSpotify();
    mockToken(client);
    (client.get as jest.Mock).mockResolvedValueOnce({ status: 204, data: "" });

    await expect(spotify.getAvailableDevices()).resolves.toEqual({
      status: 204,
      data: [],
    });

    (client.get as jest.Mock).mockResolvedValueOnce({ status: 401, data: {} });

    await expect(spotify.getAvailableDevices()).resolves.toEqual({
      status: 401,
      data: [],
    });
  });

  it("기기 응답에 목록이 없으면 data를 undefined로 반환한다", async () => {
    const { client, spotify } = await loadSpotify();
    mockToken(client);
    (client.get as jest.Mock).mockResolvedValue({ status: 200, data: {} });

    await expect(spotify.getAvailableDevices()).resolves.toEqual({
      status: 200,
      data: undefined,
    });
  });

  it("토큰 요청이 실패하면 예외를 전파한다", async () => {
    const { client, spotify } = await loadSpotify();
    (client.post as jest.Mock).mockRejectedValue(new Error("network"));

    await expect(spotify.getAvailableDevices()).rejects.toThrow("network");
  });

  it("재생 중이면 640 이미지와 아티스트를 반환한다", async () => {
    const { client, spotify } = await loadSpotify();
    mockToken(client);
    (client.get as jest.Mock).mockResolvedValue({
      status: 200,
      data: {
        is_playing: true,
        item: {
          album: {
            name: "Album",
            images: [
              { width: 300, url: "https://img/300" },
              { width: 640, url: "https://img/640" },
            ],
          },
          artists: [{ name: "A" }, { name: "B" }],
          external_urls: { spotify: "https://open.spotify.com/track/1" },
          name: "Song",
        },
      },
    });

    await expect(spotify.getNowPlaying()).resolves.toEqual({
      status: 200,
      isPlaying: true,
      data: {
        album: "Album",
        albumImageUrl: "https://img/640",
        artist: "A, B",
        songUrl: "https://open.spotify.com/track/1",
        title: "Song",
      },
    });
    expect(client.get).toHaveBeenCalledWith(
      "https://api.spotify.com/v1/me/player/currently-playing",
      { headers: { Authorization: "Bearer access-token" } },
    );
  });

  it("재생 응답이 비어 있거나 곡이 없으면 data를 null로 반환한다", async () => {
    const { client, spotify } = await loadSpotify();
    mockToken(client);
    (client.get as jest.Mock).mockResolvedValueOnce({ status: 204, data: "" });

    await expect(spotify.getNowPlaying()).resolves.toEqual({
      status: 204,
      isPlaying: false,
      data: null,
    });

    (client.get as jest.Mock).mockResolvedValueOnce({
      status: 200,
      data: { is_playing: true, item: null },
    });

    await expect(spotify.getNowPlaying()).resolves.toEqual({
      status: 200,
      isPlaying: false,
      data: null,
    });
  });

  it("640 이미지가 없으면 albumImageUrl을 undefined로 반환한다", async () => {
    const { client, spotify } = await loadSpotify();
    mockToken(client);
    (client.get as jest.Mock).mockResolvedValue({
      status: 200,
      data: {
        is_playing: false,
        item: {
          album: {
            name: "Album",
            images: [{ width: 300, url: "https://img/300" }],
          },
          artists: [],
          external_urls: {},
          name: "Song",
        },
      },
    });

    await expect(spotify.getNowPlaying()).resolves.toEqual({
      status: 200,
      isPlaying: false,
      data: {
        album: "Album",
        albumImageUrl: undefined,
        artist: "",
        songUrl: "",
        title: "Song",
      },
    });
  });

  it("인기 곡을 조회하면 limit 10으로 64 이미지를 매핑한다", async () => {
    const { client, spotify } = await loadSpotify();
    mockToken(client);
    (client.get as jest.Mock).mockResolvedValue({
      status: 200,
      data: {
        items: [
          {
            album: {
              name: "Album",
              images: [
                { width: 300, url: "https://img/300" },
                { width: 64, url: "https://img/64" },
              ],
            },
            artists: [{ name: "A" }, { name: "B" }],
            external_urls: { spotify: "https://open.spotify.com/track/9" },
            name: "Hit",
          },
        ],
      },
    });

    await expect(spotify.getTopTracks()).resolves.toEqual({
      status: 200,
      data: [
        {
          album: {
            name: "Album",
            image: { width: 64, url: "https://img/64" },
          },
          artist: "A, B",
          songUrl: "https://open.spotify.com/track/9",
          title: "Hit",
        },
      ],
    });
    expect(client.get).toHaveBeenCalledWith(
      "https://api.spotify.com/v1/me/top/tracks?limit=10",
      { headers: { Authorization: "Bearer access-token" } },
    );
  });

  it("인기 곡 상태 코드가 400을 넘으면 빈 배열을 반환한다", async () => {
    const { client, spotify } = await loadSpotify();
    mockToken(client);
    (client.get as jest.Mock).mockResolvedValue({ status: 500, data: {} });

    await expect(spotify.getTopTracks()).resolves.toEqual({
      status: 500,
      data: [],
    });
  });

  it("트랙 목록이 없으면 예외를 전파한다", async () => {
    const { client, spotify } = await loadSpotify();
    mockToken(client);
    (client.get as jest.Mock).mockResolvedValue({ status: 200, data: {} });

    await expect(spotify.getTopTracks()).rejects.toThrow(TypeError);
  });
});
