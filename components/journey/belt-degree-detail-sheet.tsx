"use client";

import { Lock } from "lucide-react";
import { BeltDegreeVisual } from "@/components/journey/belt-degree-visual";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { JourneyBeltCard } from "@/lib/journey/belt-collection";
import { cn } from "@/lib/utils";

function formatEarnedAt(value: string | null): string {
  if (!value) return "Data não registrada";
  const date = new Date(
    value.includes("T") ? value : `${value.slice(0, 10)}T12:00:00`,
  );
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function stageLabel(degree: number): string {
  return degree === 0 ? "Faixa" : `${degree}º grau`;
}

export function BeltDegreeDetailSheet({
  card,
  open,
  onOpenChange,
}: {
  card: JourneyBeltCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!card) return null;

  const unlockedCount = card.stages.filter((s) => s.unlocked).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[88dvh] max-w-lg gap-0 overflow-y-auto rounded-t-2xl border-border bg-popover pb-[max(1rem,env(safe-area-inset-bottom))]"
        overlayClassName="bg-black/55 supports-backdrop-filter:backdrop-blur-sm"
        showCloseButton
      >
        <SheetHeader className="border-b border-border px-4 pb-3 pt-4">
          <SheetTitle>{card.belt}</SheetTitle>
          <SheetDescription>
            {card.unlocked
              ? `${unlockedCount} de ${card.stages.length} conquistas nesta faixa`
              : "Ainda não conquistada — veja o que falta"}
          </SheetDescription>
        </SheetHeader>

        <ul className="space-y-2 px-4 py-4">
          {card.stages.map((stage) => (
            <li
              key={`${card.belt}-${stage.degree}`}
              className={cn(
                "flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3",
                !stage.unlocked && "opacity-70",
              )}
            >
              <div className="relative shrink-0">
                <BeltDegreeVisual
                  belt={card.belt}
                  degree={stage.degree}
                  unlocked={stage.unlocked}
                  imageSrc={stage.imageSrc}
                  size="lg"
                />
                {!stage.unlocked ? (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-muted-foreground ring-1 ring-border">
                    <Lock className="h-3.5 w-3.5" />
                  </span>
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm font-semibold",
                    stage.unlocked ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {stageLabel(stage.degree)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {stage.unlocked
                    ? formatEarnedAt(stage.earnedAt)
                    : "Ainda falta"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
