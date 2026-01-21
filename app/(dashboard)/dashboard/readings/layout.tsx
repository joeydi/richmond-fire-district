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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <ReadingsNav />
        {canEdit && (
          <Button asChild variant="outline" className="hidden sm:flex">
            <Link href="/dashboard/readings/import">
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Link>
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}
