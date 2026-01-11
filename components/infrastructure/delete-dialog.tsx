"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { deleteInfrastructurePoint } from "@/lib/actions/infrastructure";
import type { InfrastructurePoint } from "@/lib/types/infrastructure";

interface DeleteDialogProps {
  point: InfrastructurePoint | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteDialog({
  point,
  open,
  onOpenChange,
}: DeleteDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!point) return;

    startTransition(async () => {
      const result = await deleteInfrastructurePoint(point.id);

      if (result.success) {
        toast.success(`${point.name} has been deleted`);
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete infrastructure point");
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Infrastructure Point</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-medium text-slate-900">
              {point?.name}
            </span>
            ? This will also delete all associated images. This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
