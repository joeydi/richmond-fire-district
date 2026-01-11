"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  createInfrastructurePoint,
  updateInfrastructurePoint,
} from "@/lib/actions/infrastructure";
import type {
  InfrastructurePoint,
  InfrastructureType,
  InfrastructureStatus,
} from "@/lib/types/infrastructure";
import { INFRASTRUCTURE_LABELS } from "@/lib/types/infrastructure";
import { InfrastructureImages } from "./infrastructure-images";

const infrastructureTypes: InfrastructureType[] = [
  "shutoff_valve",
  "hydrant",
  "well",
  "meter",
  "reservoir",
  "other",
];

const infrastructureStatuses: InfrastructureStatus[] = [
  "active",
  "inactive",
  "maintenance",
];

const statusLabels: Record<InfrastructureStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  maintenance: "Maintenance",
  unknown: "Unknown",
};

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["shutoff_valve", "hydrant", "well", "meter", "reservoir", "other"]),
  status: z.enum(["active", "inactive", "maintenance"]),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface InfrastructureFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  point?: InfrastructurePoint | null;
  initialCoordinates?: { lat: number; lng: number };
  onSuccess?: () => void;
}

export function InfrastructureForm({
  open,
  onOpenChange,
  point,
  initialCoordinates,
  onSuccess,
}: InfrastructureFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!point;

  // Helper to get a valid status for the form (unknown not allowed in form)
  const getValidStatus = (status?: InfrastructureStatus): Exclude<InfrastructureStatus, 'unknown'> => {
    if (status && status !== "unknown" && infrastructureStatuses.includes(status)) {
      return status as Exclude<InfrastructureStatus, 'unknown'>;
    }
    return "active";
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: point?.name || "",
      type: point?.type || "hydrant",
      status: getValidStatus(point?.status),
      latitude: point?.latitude || initialCoordinates?.lat || 0,
      longitude: point?.longitude || initialCoordinates?.lng || 0,
      notes: point?.notes || "",
    },
  });

  // Reset form when dialog opens with new point or coordinates
  useEffect(() => {
    if (open) {
      form.reset({
        name: point?.name || "",
        type: point?.type || "hydrant",
        status: getValidStatus(point?.status),
        latitude: point?.latitude || initialCoordinates?.lat || 0,
        longitude: point?.longitude || initialCoordinates?.lng || 0,
        notes: point?.notes || "",
      });
    }
  }, [open, point, initialCoordinates, form]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      if (isEditing && point) {
        const result = await updateInfrastructurePoint(point.id, {
          name: data.name,
          type: data.type,
          status: data.status,
          latitude: data.latitude,
          longitude: data.longitude,
          notes: data.notes || undefined,
        });

        if (result.error) {
          toast.error(result.error);
          return;
        }

        toast.success("Infrastructure point updated successfully");
      } else {
        const result = await createInfrastructurePoint({
          name: data.name,
          type: data.type,
          status: data.status,
          latitude: data.latitude,
          longitude: data.longitude,
          notes: data.notes || undefined,
        });

        if (result.error) {
          toast.error(result.error);
          return;
        }

        toast.success("Infrastructure point created successfully");
      }

      onOpenChange(false);
      onSuccess?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Infrastructure Point" : "Add Infrastructure Point"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the details of this infrastructure point."
              : "Add a new infrastructure point to the map."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Main Street Hydrant"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-500">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                value={form.watch("type")}
                onValueChange={(value) =>
                  form.setValue("type", value as InfrastructureType)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {infrastructureTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {INFRASTRUCTURE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(value) =>
                  form.setValue("status", value as "active" | "inactive" | "maintenance")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {infrastructureStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {statusLabels[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude *</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                placeholder="44.3710"
                {...form.register("latitude", { valueAsNumber: true })}
              />
              {form.formState.errors.latitude && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.latitude.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude *</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                placeholder="-72.9440"
                {...form.register("longitude", { valueAsNumber: true })}
              />
              {form.formState.errors.longitude && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.longitude.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Optional notes about this point..."
              rows={3}
              {...form.register("notes")}
            />
          </div>

          {/* Images section - only show when editing */}
          {isEditing && point && (
            <div className="space-y-2 pt-2 border-t">
              <Label>Images</Label>
              <InfrastructureImages
                infrastructurePointId={point.id}
                isAdmin={true}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : isEditing
                  ? "Update Point"
                  : "Create Point"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
