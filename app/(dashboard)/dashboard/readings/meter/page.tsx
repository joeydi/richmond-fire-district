import { requireEditor } from "@/lib/auth/roles";
import { getMeters } from "@/lib/actions/readings";
import { MeterReadingForm } from "@/components/readings/meter-reading-form";

export default async function MeterReadingPage() {
  await requireEditor();
  const meters = await getMeters();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {meters.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-slate-600">No meters configured yet.</p>
          <p className="mt-1 text-sm text-slate-500">
            An admin needs to add meters before you can record readings.
          </p>
        </div>
      ) : (
        <MeterReadingForm meters={meters} />
      )}
    </div>
  );
}
