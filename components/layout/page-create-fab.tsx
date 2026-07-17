import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageCreateFab({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "fixed z-40 inline-flex items-center gap-2 rounded-full",
        "bg-[var(--page-fab-bg)] px-5 py-3.5",
        "text-sm font-semibold tracking-wide text-[var(--page-fab-fg)]",
        "shadow-[var(--page-fab-shadow)]",
        "transition-[transform,box-shadow,filter] duration-200",
        "hover:brightness-110 active:scale-[0.97]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--page-fab-bg)] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4",
        "lg:bottom-8 lg:right-8",
        className,
      )}
      aria-label={label}
    >
      <Plus className="h-5 w-5 stroke-[2.5]" aria-hidden />
      <span>{label}</span>
    </Link>
  );
}
