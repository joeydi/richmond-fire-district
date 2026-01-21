import { requireEditor } from "@/lib/auth/roles";
import {
  getMeters,
  getReservoirs,
  getLastMeterReading,
  getLastChlorineReading,
  getLastReservoirReading,
} from "@/lib/actions/readings";
import { MeterReadingForm } from "@/components/readings/meter-reading-form";
import { ChlorineForm } from "@/components/readings/chlorine-form";
import { ReservoirForm } from "@/components/readings/reservoir-form";

export default async function ReadingsPage() {
  await requireEditor();

  const [meters, reservoirs, lastChlorineReading] = await Promise.all([
    getMeters(),
    getReservoirs(),
    getLastChlorineReading(),
  ]);

  // Fetch last readings for each meter and reservoir in parallel
  const [lastMeterReadings, lastReservoirReadings] = await Promise.all([
    Promise.all(
      meters.map(async (meter) => ({
        meterId: meter.id,
        lastReading: await getLastMeterReading(meter.id),
      }))
    ),
    Promise.all(
      reservoirs.map(async (reservoir) => ({
        reservoirId: reservoir.id,
        lastReading: await getLastReservoirReading(reservoir.id),
      }))
    ),
  ]);

  // Convert to lookup maps
  const meterLastReadings: Record<string, number | null> = {};
  for (const { meterId, lastReading } of lastMeterReadings) {
    meterLastReadings[meterId] = lastReading;
  }

  const reservoirLastReadings: Record<string, number | null> = {};
  for (const { reservoirId, lastReading } of lastReservoirReadings) {
    reservoirLastReadings[reservoirId] = lastReading;
  }

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
            <MeterReadingForm meters={meters} lastReadings={meterLastReadings} />
          )}
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
            <ReservoirForm reservoirs={reservoirs} lastReadings={reservoirLastReadings} />
          )}
        </div>

        {/* Chlorine Form */}
        <div>
          <ChlorineForm lastReading={lastChlorineReading} />
        </div>
      </div>
    </div>
  );
}
