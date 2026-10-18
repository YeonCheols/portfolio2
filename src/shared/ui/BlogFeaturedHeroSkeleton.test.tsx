import { render } from "@testing-library/react";

import BlogFeaturedHeroSkeleton from "@/shared/ui/BlogFeaturedHeroSkeleton";

describe("BlogFeaturedHeroSkeleton", () => {
  it("히어로 스켈레톤을 높이 400으로 렌더한다", () => {
    const { container } = render(<BlogFeaturedHeroSkeleton />);
    const skeletons = container.querySelectorAll(".react-loading-skeleton");

    expect(skeletons).toHaveLength(1);
    expect(skeletons[0]).toHaveStyle({ height: "400px" });
  });
});
