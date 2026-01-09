import { requireEditor } from "@/lib/auth/roles";
import { getInfrastructureLocations } from "@/lib/actions/readings";
import { ChlorineForm } from "@/components/readings/chlorine-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function ChlorinePage() {
  await requireEditor();
  const locations = await getInfrastructureLocations();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/readings">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Chlorine Levels</h1>
          <p className="text-sm text-slate-600">Record a chlorine reading</p>
        </div>
      </div>

      <ChlorineForm locations={locations} />
    </div>
  );
}
