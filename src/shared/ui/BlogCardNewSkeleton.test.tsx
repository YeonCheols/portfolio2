import { render } from "@testing-library/react";

import BlogCardNewSkeleton from "@/shared/ui/BlogCardNewSkeleton";

describe("BlogCardNewSkeleton", () => {
  it("카드 스켈레톤을 높이 398로 렌더한다", () => {
    const { container } = render(<BlogCardNewSkeleton />);
    const skeletons = container.querySelectorAll(".react-loading-skeleton");

    expect(skeletons).toHaveLength(1);
    expect(skeletons[0]).toHaveStyle({ height: "398px" });
  });
});
