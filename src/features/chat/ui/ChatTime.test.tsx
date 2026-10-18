import { render, screen } from "@testing-library/react";
import { format } from "date-fns";

import ChatTime from "@/features/chat/ui/ChatTime";

describe("ChatTime", () => {
  it("오늘이 아니면 날짜 형식으로 보여 준다", () => {
    const datetime = "2020-01-02T03:04:00.000Z";
    render(<ChatTime datetime={datetime} />);

    expect(
      screen.getByText(format(new Date(datetime), "dd/MM/yyyy, HH:mm")),
    ).toBeInTheDocument();
  });
});
