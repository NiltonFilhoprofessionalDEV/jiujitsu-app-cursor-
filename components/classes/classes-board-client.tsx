"use client";

import useSWR from "swr";
import type { ClassesBoardData } from "@/actions/swr-data";
import { fetchClassesBoard } from "@/actions/swr-data";
import { ClassListCard } from "@/components/classes/class-list-card";
import { PageCreateFab } from "@/components/layout/page-create-fab";
import { EmptyState } from "@/components/ui/empty-state";
import { swrKeys } from "@/lib/swr/keys";

export function ClassesBoardClient({
  initialData,
  canManage,
  isStudent,
}: {
  initialData: ClassesBoardData;
  canManage: boolean;
  isStudent: boolean;
}) {
  const { data = initialData } = useSWR(swrKeys.classesBoard, fetchClassesBoard, {
    fallbackData: initialData,
  });

  const { classes, timeZone, openByClassId } = data;

  return (
    <>
      <div className="space-y-3">
        {classes.length === 0 ? (
          <EmptyState
            title={
              isStudent
                ? "Você ainda não está em nenhuma turma"
                : "Nenhuma turma no horário"
            }
            description={
              isStudent
                ? "Peça ao professor ou à academia para te adicionar na turma de adultos."
                : "Monte a primeira turma com dias e horários para abrir aulas e bater presença."
            }
            actionHref={canManage ? "/classes/new" : undefined}
            actionLabel={canManage ? "Nova turma" : undefined}
          />
        ) : (
          classes.map((klass) => (
            <ClassListCard
              key={klass.id}
              klass={klass}
              canManage={canManage}
              isStudent={isStudent}
              timeZone={timeZone}
              openSessionId={openByClassId[klass.id] ?? null}
            />
          ))
        )}
      </div>

      {canManage ? (
        <PageCreateFab href="/classes/new" label="Nova turma" />
      ) : null}
    </>
  );
}
