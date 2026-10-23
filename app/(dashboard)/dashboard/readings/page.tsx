import { cache } from "react";
import { requireEditor } from "@/lib/auth/roles";
import { getDailyRoundContext } from "@/lib/actions/readings";
import { DailyRoundForm } from "@/components/readings/daily-round-form";

const getRequestTime = cache(() => Date.now());

const todayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
  month: "short",
  day: "numeric",
});

export default async function ReadingsPage() {
  await requireEditor();

  const context = await getDailyRoundContext();
  const now = getRequestTime();
  // "Fri, Oct 23" → "FRI · OCT 23"
  const todayLabel = todayFormatter.format(now).toUpperCase().replace(", ", " · ");

  return <DailyRoundForm context={context} todayLabel={todayLabel} now={now} />;
}
