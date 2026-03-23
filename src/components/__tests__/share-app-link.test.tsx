import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShareAppLink } from "../share-app-link";

describe("ShareAppLink", () => {
  beforeEach(() => {
    vi.spyOn(window, "open").mockImplementation(() => null);
  });

  it("renders the share button", () => {
    render(<ShareAppLink />);
    expect(
      screen.getByRole("button", { name: /compartilhar com amigos/i })
    ).toBeInTheDocument();
  });

  it("opens a WhatsApp URL on click", async () => {
    const user = userEvent.setup();
    render(<ShareAppLink />);

    await user.click(screen.getByRole("button", { name: /compartilhar com amigos/i }));

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining("wa.me"),
      "_blank",
      "noopener,noreferrer"
    );
  });

  it("WhatsApp URL contains encoded app link text", async () => {
    const user = userEvent.setup();
    render(<ShareAppLink />);

    await user.click(screen.getByRole("button", { name: /compartilhar com amigos/i }));

    const [url] = (window.open as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(decodeURIComponent(url)).toContain("Clube do Bolinha");
  });
});
