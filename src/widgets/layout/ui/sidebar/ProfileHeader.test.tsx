import { render, screen } from "@testing-library/react";
import useSWR from "swr";

import ProfileHeader from "@/widgets/layout/ui/sidebar/ProfileHeader";

jest.mock("swr", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockedUseSWR = useSWR as jest.Mock;

describe("ProfileHeader", () => {
  it("프로필이 없으면 기본 이름과 이미지를 보여 준다", () => {
    mockedUseSWR.mockReturnValue({ data: undefined });

    render(<ProfileHeader expandMenu={false} imageSize={40} />);

    expect(
      screen.getByRole("heading", { name: "성 연 철" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "성 연 철" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      screen.getByRole("img", { name: "프로필" }).getAttribute("src"),
    ).toContain("main-profile.png");
    expect(screen.getByRole("link", { name: "" })).toHaveAttribute(
      "href",
      "https://github.com/YeonCheols",
    );
  });

  it("프로필을 받으면 프로필 이미지를 보여 준다", () => {
    mockedUseSWR.mockReturnValue({
      data: {
        data: {
          id: 1,
          name: "연철",
          imageUrl: "https://example.com/profile.png",
          isActive: true,
        },
      },
    });

    render(<ProfileHeader expandMenu={false} imageSize={80} />);

    expect(
      screen.getByRole("img", { name: "연철" }).getAttribute("src"),
    ).toContain("example.com");
    expect(
      screen.getByRole("heading", { name: "성 연 철" }),
    ).toBeInTheDocument();
  });
});
