"use client";

import Link from "next/link";
import type { EligibleGraduationCandidate } from "@/actions/belt-requirements";
import { BeltPill } from "@/components/belts/belt-pill";

export function EligibleGraduationsPanel({
  candidates,
}: {
  candidates: EligibleGraduationCandidate[];
}) {
  if (candidates.length === 0) return null;

  return (
    <section className="space-y-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 shadow-[var(--surface-shadow)]">
      <div>
        <h2 className="text-sm font-semibold text-foreground">
          Elegíveis para graduação
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Alunos que bateram a meta de aulas. Confirme a graduação quando
          estiver pronto.
        </p>
      </div>
      <ul className="space-y-2">
        {candidates.map((item) => (
          <li
            key={`${item.memberId}-${item.kind}-${item.targetBelt}-${item.targetDegree}`}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/80 px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {item.memberName}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {item.kind === "degree"
                  ? `Pronto para ${item.targetDegree}º grau`
                  : `Pronto para faixa ${item.targetBelt}`}
                {" · "}
                {item.classesSinceGraduation} aulas
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <BeltPill
                belt={item.currentBelt}
                degree={item.currentDegree}
              />
              <Link
                href={`/graduations?member=${item.memberId}&new=1`}
                className="inline-flex h-9 items-center rounded-lg bg-[var(--action-red)] px-3 text-xs font-semibold text-white"
              >
                Graduar
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
