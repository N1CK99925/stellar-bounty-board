import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CreateBountyForm } from "../components/CreateBountyForm";

describe("CreateBountyForm", () => {
  it("shows a validation error when description is empty", () => {
    const onSubmit = vi.fn();
    render(<CreateBountyForm onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: /create bounty/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/describe the task/i);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows a validation error when amount is not a positive number", () => {
    const onSubmit = vi.fn();
    render(<CreateBountyForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByPlaceholderText(/fix the mobile nav/i), {
      target: { value: "Improve loading states" },
    });
    fireEvent.change(screen.getByPlaceholderText("500"), {
      target: { value: "-10" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create bounty/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/positive number/i);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit with trimmed description and parsed amount", () => {
    const onSubmit = vi.fn();
    render(<CreateBountyForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByPlaceholderText(/fix the mobile nav/i), {
      target: { value: "  Improve loading states  " },
    });
    fireEvent.change(screen.getByPlaceholderText("500"), {
      target: { value: "250" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create bounty/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const arg = onSubmit.mock.calls[0][0];
    expect(arg.description).toBe("Improve loading states");
    expect(arg.amount).toBe(250);
  });
});
