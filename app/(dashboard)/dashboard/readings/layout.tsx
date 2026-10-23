import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { isEditorOrAdmin } from "@/lib/auth/roles";
import { ReadingsNav } from "@/components/readings/readings-nav";

export default async function ReadingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const canEdit = await isEditorOrAdmin();

  return (
    <div data-flush className="flex min-h-full flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <ReadingsNav />
        <div className="hidden flex-1 sm:block" />
        {canEdit && (
          <Button asChild variant="outline" size="sm" className="hidden h-7 px-2 font-mono text-[11px] sm:flex">
            <Link href="/dashboard/readings/import">
              <Upload className="size-3.5" />
              IMPORT CSV
            </Link>
          </Button>
        )}
      </div>
      {/* The entry form is full-bleed; history and import pages keep page padding */}
      <div className="flex flex-1 flex-col p-4 has-[[data-round]]:p-0 lg:p-6">{children}</div>
    </div>
  );
}
