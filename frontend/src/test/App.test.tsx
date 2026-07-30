import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "../App";

describe("App", () => {
  it("loads and displays the demo bounties when no contract is configured", async () => {
    render(<App />);

    expect(screen.getByTestId("demo-mode-banner")).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText(/Fix responsive layout bug on the bounty detail page/i),
      ).toBeInTheDocument();
    });
  });

  it("shows the connect wallet button when no wallet is connected", () => {
    render(<App />);
    expect(screen.getByTestId("connect-wallet-button")).toBeInTheDocument();
  });
});
