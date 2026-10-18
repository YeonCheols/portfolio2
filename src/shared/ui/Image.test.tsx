import { fireEvent, render, screen } from "@testing-library/react";

import Image from "@/shared/ui/Image";

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({
    alt,
    src,
    onLoad,
    className,
  }: {
    alt: string;
    src: string;
    onLoad?: () => void;
    className?: string;
  }) => <img alt={alt} src={src} className={className} onLoad={onLoad} />,
}));

describe("Image", () => {
  it("로드 전에는 블러 상태로 이미지를 렌더한다", () => {
    const { container } = render(
      <Image src="/logo.png" alt="로고" width={120} height={80} />,
    );

    const image = screen.getByRole("img", { name: "로고" });
    expect(image).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("animate-pulse");
    expect(image).toHaveClass("blur-xl");
  });

  it("로드가 끝나면 블러를 해제한다", () => {
    const { container } = render(
      <Image src="/logo.png" alt="로고" width={120} height={80} />,
    );

    fireEvent.load(screen.getByRole("img", { name: "로고" }));

    expect(container.firstChild).not.toHaveClass("animate-pulse");
    expect(screen.getByRole("img", { name: "로고" })).toHaveClass("blur-0");
  });

  it("rounded를 넘기면 래퍼에 그 클래스를 둔다", () => {
    const { container } = render(
      <Image
        src="/logo.png"
        alt="로고"
        width={120}
        height={80}
        rounded="rounded-full"
      />,
    );

    expect(container.firstChild).toHaveClass("rounded-full");
  });
});
