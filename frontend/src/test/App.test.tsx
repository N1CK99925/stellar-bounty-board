import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

describe("App", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("loads and displays the demo bounties when no contract is configured", async () => {
    vi.stubEnv("VITE_BOUNTY_CONTRACT_ID", "");
    vi.stubEnv("VITE_REPUTATION_CONTRACT_ID", "");
    const { default: App } = await import("../App");

    render(<App />);

    expect(screen.getByTestId("demo-mode-banner")).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText(/Fix responsive layout bug on the bounty detail page/i),
      ).toBeInTheDocument();
    });
  });

  it("shows the connect wallet button when no wallet is connected", async () => {
    vi.stubEnv("VITE_BOUNTY_CONTRACT_ID", "");
    vi.stubEnv("VITE_REPUTATION_CONTRACT_ID", "");
    const { default: App } = await import("../App");

    render(<App />);
    expect(screen.getByTestId("connect-wallet-button")).toBeInTheDocument();
  });
});
