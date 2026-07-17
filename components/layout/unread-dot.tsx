import { cn } from "@/lib/utils";

/** Small unread indicator for nav / menu items. */
export function UnreadDot({
  show,
  className,
  label = "Não lido",
}: {
  show: boolean;
  className?: string;
  label?: string;
}) {
  if (!show) return null;
  return (
    <span
      className={cn(
        "absolute right-0 top-0 h-2 w-2 rounded-full bg-[var(--action-red)] ring-2 ring-[var(--nav-bg,var(--background))]",
        className,
      )}
      aria-label={label}
    />
  );
}
