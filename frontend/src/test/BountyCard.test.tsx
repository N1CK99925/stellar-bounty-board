import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BountyCard } from "../components/BountyCard";
import type { Bounty } from "../lib/types";

const baseBounty: Bounty = {
  id: 1,
  creator: "GACREATOR1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  claimer: null,
  amount: 500,
  description: "Fix the footer alignment bug",
  status: "Open",
};

describe("BountyCard", () => {
  it("renders the bounty description and reward amount", () => {
    render(<BountyCard bounty={baseBounty} />);
    expect(screen.getByText(/Fix the footer alignment bug/i)).toBeInTheDocument();
    expect(screen.getByText(/500 XLM/i)).toBeInTheDocument();
  });

  it("shows a claim button for open bounties and calls onClaim when clicked", () => {
    const onClaim = vi.fn();
    render(<BountyCard bounty={baseBounty} onClaim={onClaim} />);

    const button = screen.getByRole("button", { name: /claim bounty/i });
    fireEvent.click(button);

    expect(onClaim).toHaveBeenCalledWith(1);
  });

  it("shows a complete button for claimed bounties instead of a claim button", () => {
    const claimed: Bounty = { ...baseBounty, status: "Claimed", claimer: "GACLAIMERXXX" };
    render(<BountyCard bounty={claimed} onComplete={vi.fn()} />);

    expect(screen.queryByRole("button", { name: /claim bounty/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mark completed/i })).toBeInTheDocument();
  });

  it("disables action buttons while busy", () => {
    const onClaim = vi.fn();
    render(<BountyCard bounty={baseBounty} onClaim={onClaim} busy />);

    const button = screen.getByRole("button", { name: /submitting/i });
    expect(button).toBeDisabled();
  });
});
