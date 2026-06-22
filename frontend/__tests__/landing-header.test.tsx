import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LandingHeader } from "@/components/landing-header";

describe("LandingHeader", () => {
  it("renders logo and brand name", () => {
    render(<LandingHeader />);
    expect(screen.getByText("SupportPilot")).toBeInTheDocument();
  });

  it("renders desktop navigation links", () => {
    render(<LandingHeader />);
    expect(screen.getByText("Features")).toBeInTheDocument();
    expect(screen.getByText("How It Works")).toBeInTheDocument();
    expect(screen.getByText("Pricing")).toBeInTheDocument();
  });

  it("renders sign in and get started buttons", () => {
    render(<LandingHeader />);
    expect(screen.getByText("Sign In")).toBeInTheDocument();
    expect(screen.getByText("Get Started")).toBeInTheDocument();
  });

  it("renders hamburger menu button", () => {
    render(<LandingHeader />);
    expect(screen.getByLabelText("Open menu")).toBeInTheDocument();
  });

  it("opens mobile menu on hamburger click", async () => {
    render(<LandingHeader />);
    const button = screen.getByLabelText("Open menu");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByLabelText("Close menu")).toBeInTheDocument();
    });

    // Mobile nav should be visible
    const mobileNav = screen.getByRole("dialog");
    expect(mobileNav).toBeInTheDocument();
  });

  it("closes mobile menu on second click", async () => {
    render(<LandingHeader />);
    const button = screen.getByLabelText("Open menu");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByLabelText("Close menu")).toBeInTheDocument();
    });

    const closeButton = screen.getByLabelText("Close menu");
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.getByLabelText("Open menu")).toBeInTheDocument();
    });
  });

  it("closes mobile menu on Escape key", async () => {
    render(<LandingHeader />);
    const button = screen.getByLabelText("Open menu");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("locks body scroll when menu is open", async () => {
    render(<LandingHeader />);
    const button = screen.getByLabelText("Open menu");

    expect(document.body.style.overflow).toBe("");

    fireEvent.click(button);

    await waitFor(() => {
      expect(document.body.style.overflow).toBe("hidden");
    });
  });

  it("has skip navigation link", () => {
    render(<LandingHeader />);
    const skipLink = screen.getByText("Skip to main content");
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute("href", "#main-content");
  });

  it("has proper ARIA attributes", () => {
    render(<LandingHeader />);
    const button = screen.getByLabelText("Open menu");
    expect(button).toHaveAttribute("aria-expanded", "false");
  });
});
