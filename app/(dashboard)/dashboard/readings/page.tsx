import { requireEditor } from "@/lib/auth/roles";
import {
  getMeters,
  getReservoirs,
  getInfrastructureLocations,
} from "@/lib/actions/readings";
import { MeterReadingForm } from "@/components/readings/meter-reading-form";
import { ChlorineForm } from "@/components/readings/chlorine-form";
import { ReservoirForm } from "@/components/readings/reservoir-form";

export default async function ReadingsPage() {
  await requireEditor();

  const [meters, reservoirs, locations] = await Promise.all([
    getMeters(),
    getReservoirs(),
    getInfrastructureLocations(),
  ]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Meter Reading Form */}
        <div>
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

        {/* Chlorine Form */}
        <div>
          <ChlorineForm locations={locations} />
        </div>

        {/* Reservoir Form */}
        <div>
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
      </div>
    </div>
  );
}
