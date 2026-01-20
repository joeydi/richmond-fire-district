import { requireEditor } from "@/lib/auth/roles";
import { getMeters, getReservoirs } from "@/lib/actions/readings";
import { ImportWizard } from "@/components/readings/import-wizard";

export default async function ImportPage() {
  await requireEditor();
  const meters = await getMeters();
  const reservoirs = await getReservoirs();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <ImportWizard meters={meters} reservoirs={reservoirs} />
    </div>
  );
}
