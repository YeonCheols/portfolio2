import { render } from "@testing-library/react";

import ProductCardSkeleton from "@/shared/ui/ProductCardSkeleton";

describe("ProductCardSkeleton", () => {
  it("불러오면 자리 표시를 보여 준다", () => {
    const { container } = render(<ProductCardSkeleton />);

    expect(container.querySelectorAll("[aria-busy='true']")).toHaveLength(5);
  });
});
