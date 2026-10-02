import { ListTodo } from "lucide-react";

export function TasksPanel() {
  return (
    <div className="m-auto flex min-h-full w-full max-w-md flex-col items-center justify-center gap-5 px-6 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink/[0.06]">
        <ListTodo className="h-7 w-7 text-ink-muted" aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold text-ink">Tasks</p>
        <p className="max-w-[260px] text-xs leading-relaxed text-ink-faint">
          Create, organize, and check off tasks while you focus.
          Coming soon.
        </p>
      </div>
    </div>
  );
}
