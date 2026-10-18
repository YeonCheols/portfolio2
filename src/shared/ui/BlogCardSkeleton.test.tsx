import { render } from "@testing-library/react";

import BlogCardSkeleton from "@/shared/ui/BlogCardSkeleton";

describe("BlogCardSkeleton", () => {
  it("이미지와 본문 자리의 스켈레톤을 렌더한다", () => {
    const { container } = render(<BlogCardSkeleton />);
    const skeletons = container.querySelectorAll(".react-loading-skeleton");

    expect(skeletons).toHaveLength(6);
    expect(skeletons[0]).toHaveStyle({ height: "192px" });
  });
});
