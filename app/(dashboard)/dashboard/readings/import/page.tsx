import { requireEditor } from "@/lib/auth/roles";
import { getMeters, getReservoirs } from "@/lib/actions/readings";
import { ImportWizard } from "@/components/readings/import-wizard";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function ImportPage() {
  await requireEditor();
  const meters = await getMeters();
  const reservoirs = await getReservoirs();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/readings">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Import Readings</h1>
          <p className="text-sm text-slate-600">
            Upload a CSV file to bulk import reading data
          </p>
        </div>
      </div>

      <ImportWizard meters={meters} reservoirs={reservoirs} />
    </div>
  );
}
