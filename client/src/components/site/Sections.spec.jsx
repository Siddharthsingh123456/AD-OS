import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../lib/auth.jsx", () => ({ useAuth: () => ({ user: null }) }));
const { PricingSection, TourSection } = await import("./Sections.jsx");

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("TourSection", () => {
  it("switches screenshots with the tabs and announces the caption", () => {
    wrap(<TourSection />);
    const img = screen.getByRole("img");
    expect(img.getAttribute("src")).toMatch(/dashboard\.jpg$/);
    fireEvent.click(screen.getByRole("tab", { name: "Shared memory" }));
    expect(screen.getByRole("img").getAttribute("src")).toMatch(/memory\.jpg$/);
    expect(screen.getByRole("tab", { name: "Shared memory" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("status")).toHaveTextContent(/Save a fact once/);
  });
});

describe("PricingSection", () => {
  it("marks exactly one plan as recommended and switches billing period", () => {
    wrap(<PricingSection />);
    expect(screen.getAllByText("Recommended")).toHaveLength(1);
    const group = screen.getByRole("group", { name: "Billing period" });
    fireEvent.click(within(group).getByRole("button", { name: /Yearly/ }));
    expect(within(group).getByRole("button", { name: /Yearly/ })).toHaveClass("on");
  });
});
