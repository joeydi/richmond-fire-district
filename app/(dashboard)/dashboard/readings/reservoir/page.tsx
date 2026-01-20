import { requireEditor } from "@/lib/auth/roles";
import { getReservoirs } from "@/lib/actions/readings";
import { ReservoirForm } from "@/components/readings/reservoir-form";

export default async function ReservoirPage() {
  await requireEditor();
  const reservoirs = await getReservoirs();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {reservoirs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-slate-600">No reservoirs configured yet.</p>
          <p className="mt-1 text-sm text-slate-500">
            An admin needs to add reservoirs before you can record readings.
          </p>
        </div>
      ) : (
        <ReservoirForm reservoirs={reservoirs} />
      )}
    </div>
  );
}
