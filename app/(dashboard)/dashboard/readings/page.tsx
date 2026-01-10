import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Droplets, FlaskConical, Waves, Upload } from "lucide-react";
import { isEditorOrAdmin } from "@/lib/auth/roles";

const readingTypes = [
  {
    title: "Water Production",
    description: "Record meter readings for water production",
    href: "/dashboard/readings/water-production",
    icon: Droplets,
  },
  {
    title: "Chlorine Levels",
    description: "Record chlorine residual measurements",
    href: "/dashboard/readings/chlorine",
    icon: FlaskConical,
  },
  {
    title: "Reservoir Levels",
    description: "Record reservoir water levels",
    href: "/dashboard/readings/reservoir",
    icon: Waves,
  },
];

export default async function ReadingsPage() {
  const canEdit = await isEditorOrAdmin();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Readings</h1>
          <p className="mt-1 text-sm text-slate-600">
            Select a reading type to record
          </p>
        </div>
        {canEdit && (
          <Button asChild variant="outline">
            <Link href="/dashboard/readings/import">
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {readingTypes.map((type) => (
          <Link key={type.href} href={type.href}>
            <Card className="h-full transition-colors hover:bg-slate-50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                    <type.icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{type.title}</CardTitle>
                    <CardDescription>{type.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
