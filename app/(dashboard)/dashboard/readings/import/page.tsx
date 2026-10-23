import { requireEditor } from "@/lib/auth/roles";
import { getMeters, getReservoirs } from "@/lib/actions/readings";
import { ImportWizard } from "@/components/readings/import-wizard";

export default async function ImportPage() {
  await requireEditor();
  const [meters, reservoirs] = await Promise.all([getMeters(), getReservoirs()]);

  return <ImportWizard meters={meters} reservoirs={reservoirs} />;
}
