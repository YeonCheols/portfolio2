import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useContext } from "react";

import {
  CommandPaletteContext,
  CommandPaletteProvider,
} from "@/features/cmdpallete/model/CommandPaletteContext";

describe("CommandPaletteProvider", () => {
  it("열기 상태를 바꾼다", async () => {
    const user = userEvent.setup();

    const Consumer = () => {
      const { isOpen, setIsOpen } = useContext(CommandPaletteContext);

      return (
        <button type="button" onClick={() => setIsOpen(true)}>
          {isOpen ? "열림" : "닫힘"}
        </button>
      );
    };

    render(
      <CommandPaletteProvider>
        <Consumer />
      </CommandPaletteProvider>,
    );

    expect(screen.getByRole("button", { name: "닫힘" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "닫힘" }));

    expect(screen.getByRole("button", { name: "열림" })).toBeInTheDocument();
  });
});
