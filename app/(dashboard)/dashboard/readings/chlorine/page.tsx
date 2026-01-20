import { requireEditor } from "@/lib/auth/roles";
import { getInfrastructureLocations } from "@/lib/actions/readings";
import { ChlorineForm } from "@/components/readings/chlorine-form";

export default async function ChlorinePage() {
  await requireEditor();
  const locations = await getInfrastructureLocations();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <ChlorineForm locations={locations} />
    </div>
  );
}
