import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useContext } from "react";

import { MenuContext } from "@/widgets/layout/model/MenuContext";

describe("MenuContext", () => {
  it("기본 hideNavbar를 호출하면 예외 없이 동작한다", async () => {
    const user = userEvent.setup();

    const Consumer = () => {
      const { hideNavbar } = useContext(MenuContext);

      return (
        <button type="button" onClick={hideNavbar}>
          닫기
        </button>
      );
    };

    render(<Consumer />);

    await expect(
      user.click(screen.getByRole("button", { name: "닫기" })),
    ).resolves.toBeUndefined();
  });
});
