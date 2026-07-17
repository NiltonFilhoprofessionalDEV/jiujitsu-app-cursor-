import { redirect } from "next/navigation";
import { getJourneyData } from "@/actions/journey";
import {
  JourneyHabits,
  JourneyMonthlyChart,
} from "@/components/journey/journey-habits";
import { JourneySummary } from "@/components/journey/journey-summary";
import { JourneyTimeline } from "@/components/journey/journey-timeline";
import { JourneyTrackSwitch } from "@/components/journey/journey-track-switch";
import { TrophySection } from "@/components/journey/trophy-section";
import { PageHeader } from "@/components/layout/page-header";
import { PermissionError } from "@/lib/permissions/assert";
import type { JourneyData } from "@/actions/journey";

export default async function JourneyPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const params = await searchParams;
  let data: JourneyData;
  try {
    data = await getJourneyData(params.mode);
  } catch (err) {
    if (err instanceof PermissionError) {
      redirect("/home");
    }
    redirect("/select-academy");
  }

  const description =
    data.track === "teaching"
      ? "Aulas que você deu, marcos e troféus de professor"
      : "Seu progresso, faixas e troféus no tatame";

  return (
    <div className="space-y-5 pb-2 sm:space-y-4">
      <PageHeader
        eyebrow="Progresso"
        title="Minha Jornada"
        description={description}
      />

      <JourneyTrackSwitch
        track={data.track}
        availableTracks={data.availableTracks}
      />

      <JourneySummary
        classCount={data.classCount}
        countLabel={data.countLabel}
        currentBelt={data.currentBelt}
        currentDegree={data.currentDegree}
        track={data.track}
      />

      <JourneyHabits
        track={data.track}
        streak={data.streak}
        weeklyGoal={data.weeklyGoal}
      />

      <TrophySection
        track={data.track}
        unlockedCodes={data.unlockedCodes}
        recentUnlockedCodes={data.recentUnlockedCodes}
      />

      <JourneyMonthlyChart months={data.monthlyHistory} track={data.track} />

      <JourneyTimeline events={data.timeline} />
    </div>
  );
}
