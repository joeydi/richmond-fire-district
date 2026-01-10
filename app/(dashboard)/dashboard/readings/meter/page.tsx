import { requireEditor } from "@/lib/auth/roles";
import { getMeters } from "@/lib/actions/readings";
import { MeterReadingForm } from "@/components/readings/meter-reading-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function MeterReadingPage() {
  await requireEditor();
  const meters = await getMeters();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/readings">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meter Reading</h1>
          <p className="text-sm text-slate-600">Record a meter reading</p>
        </div>
      </div>

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
