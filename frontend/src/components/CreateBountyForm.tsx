import { useState } from "react";

interface CreateBountyFormProps {
  onSubmit: (values: { id: number; amount: number; description: string }) => void;
  disabled?: boolean;
}

export function CreateBountyForm({ onSubmit, disabled }: CreateBountyFormProps) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const trimmedDescription = description.trim();
    const parsedAmount = Number(amount);

    if (trimmedDescription.length === 0) {
      setFormError("Please describe the task.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError("Reward amount must be a positive number.");
      return;
    }

    onSubmit({
      id: Date.now(),
      amount: parsedAmount,
      description: trimmedDescription,
    });
    setDescription("");
    setAmount("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <h2 className="text-base font-semibold text-slate-900">Post a new bounty</h2>

      <label className="flex flex-col gap-1 text-sm text-slate-600">
        Task description
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="e.g. Fix the mobile nav overlap on iOS Safari"
          className="rounded-lg border border-slate-300 p-2 text-sm text-slate-900 focus:border-stellar-purple focus:outline-none focus:ring-1 focus:ring-stellar-purple"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-slate-600">
        Reward (XLM)
        <input
          type="number"
          min="0"
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="500"
          className="rounded-lg border border-slate-300 p-2 text-sm text-slate-900 focus:border-stellar-purple focus:outline-none focus:ring-1 focus:ring-stellar-purple"
        />
      </label>

      {formError && (
        <p role="alert" className="text-sm text-red-600">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={disabled}
        className="w-full rounded-lg bg-stellar-purple px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {disabled ? "Submitting..." : "Create bounty"}
      </button>
    </form>
  );
}
