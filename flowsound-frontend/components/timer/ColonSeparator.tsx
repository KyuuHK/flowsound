export function ColonSeparator() {
  return (
    <span
      aria-hidden="true"
      data-colon
      className="inline-flex h-[1.15em] w-[0.55em] flex-col items-center justify-center gap-[0.13em] select-none"
    >
      <span className="h-[0.15em] w-[0.15em] rounded-full bg-[var(--accent-red)]" />
      <span className="h-[0.15em] w-[0.15em] rounded-full bg-[var(--accent-red)]" />
    </span>
  );
}