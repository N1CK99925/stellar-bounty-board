interface LoadingSpinnerProps {
  label?: string;
}

export function LoadingSpinner({ label = "Loading..." }: LoadingSpinnerProps) {
  return (
    <div
      data-testid="loading-spinner"
      className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500"
    >
      <span
        className="h-4 w-4 animate-spin rounded-full border-2 border-stellar-purple border-t-transparent"
        aria-hidden="true"
      />
      <span>{label}</span>
    </div>
  );
}
