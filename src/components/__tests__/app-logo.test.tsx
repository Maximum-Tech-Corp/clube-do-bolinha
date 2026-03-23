import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppLogo } from "../app-logo";

describe("AppLogo", () => {
  it("renders the soccer ball emoji", () => {
    render(<AppLogo />);
    expect(screen.getByRole("img", { name: "bola de futebol" })).toBeInTheDocument();
  });

  it("renders the app name", () => {
    render(<AppLogo />);
    expect(screen.getByText("Clube do Bolinha")).toBeInTheDocument();
  });

  it("defaults to md size", () => {
    const { container } = render(<AppLogo />);
    expect(container.firstChild).toHaveClass("gap-3");
  });

  it("applies sm size classes", () => {
    const { container } = render(<AppLogo size="sm" />);
    expect(container.firstChild).toHaveClass("gap-2");
  });

  it("applies lg size classes", () => {
    const { container } = render(<AppLogo size="lg" />);
    expect(container.firstChild).toHaveClass("gap-4");
  });
});
