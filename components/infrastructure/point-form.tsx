"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LocateFixed, Loader2 } from "lucide-react";
import { toast } from "sonner";
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
import { cn } from "@/lib/utils";
import { createInfrastructurePoint, updateInfrastructurePoint } from "@/lib/actions/infrastructure";
import {
  INFRASTRUCTURE_COLORS,
  INFRASTRUCTURE_LABELS,
  INFRASTRUCTURE_STATUS_COLORS,
  INFRASTRUCTURE_STATUS_LABELS,
  type InfrastructurePoint,
  type InfrastructureType,
} from "@/lib/types/infrastructure";

const TYPES = ["shutoff_valve", "hydrant", "well", "meter", "reservoir", "other"] as const satisfies readonly InfrastructureType[];
const STATUSES = ["active", "inactive", "maintenance"] as const;
type EditableStatus = (typeof STATUSES)[number];

const coordinate = (label: string, limit: number) =>
  z
    .number({ error: `${label} is required` })
    .min(-limit, `${label} must be between −${limit} and ${limit}`)
    .max(limit, `${label} must be between −${limit} and ${limit}`);

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  type: z.enum(TYPES),
  status: z.enum(STATUSES),
  latitude: coordinate("Latitude", 90),
  longitude: coordinate("Longitude", 180),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const labelClass = "font-mono text-[10px] font-normal tracking-[0.08em] text-muted-foreground uppercase";

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-red-600">{message}</p> : null;
}

interface PointFormProps {
  /** Omit to create a new point */
  point?: InfrastructurePoint | null;
  onCancel: () => void;
  onSaved: (point: InfrastructurePoint) => void;
}

/** Edit or create form for the infrastructure side sheet */
export function PointForm({ point, onCancel, onSaved }: PointFormProps) {
  const isEditing = !!point;
  const [isLocating, setIsLocating] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: point?.name ?? "",
      type: point?.type ?? "hydrant",
      // "unknown" isn't offered in the form
      status: point && point.status !== "unknown" ? point.status : "active",
      latitude: point?.latitude,
      longitude: point?.longitude,
      notes: point?.notes ?? "",
    },
  });
  const { errors, isSubmitting, isDirty } = form.formState;

  const useCurrentLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Geolocation is not supported by this browser");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const options = { shouldDirty: true, shouldValidate: true };
        form.setValue("latitude", Number(latitude.toFixed(6)), options);
        form.setValue("longitude", Number(longitude.toFixed(6)), options);
        setIsLocating(false);
        toast.success(`Location set (accurate to about ${Math.round(accuracy)} m)`);
      },
      (error) => {
        setIsLocating(false);
        const messages: Record<number, string> = {
          [error.PERMISSION_DENIED]: "Location permission denied. Enable it in your browser settings.",
          [error.POSITION_UNAVAILABLE]: "Location is currently unavailable",
          [error.TIMEOUT]: "Timed out getting your location",
        };
        toast.error(messages[error.code] || "Could not get your location");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const onSubmit = async (data: FormData) => {
    const input = { ...data, notes: data.notes?.trim() || undefined };
    const result = isEditing ? await updateInfrastructurePoint(point.id, input) : await createInfrastructurePoint(input);
    if (result.error || !result.data) {
      toast.error(result.error ?? "Could not save point");
      return;
    }
    toast.success(isEditing ? "Point updated" : "Point created");
    onSaved(result.data);
  };

  const type = useWatch({ control: form.control, name: "type" });
  const status = useWatch({ control: form.control, name: "status" });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex h-full flex-col">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-3.5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="point-name" className={labelClass}>
            Name
          </Label>
          <Input
            id="point-name"
            placeholder="e.g. 114 Robbins Mtn Rd Shutoff"
            autoFocus={!isEditing}
            aria-invalid={!!errors.name}
            className="h-8 text-[13px]"
            {...form.register("name")}
          />
          <FieldError message={errors.name?.message} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="point-type" className={labelClass}>
              Type
            </Label>
            <Select
              value={type}
              onValueChange={(value) => form.setValue("type", value as InfrastructureType, { shouldDirty: true })}
            >
              <SelectTrigger id="point-type" size="sm" className="!h-8 w-full px-2 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    <span className="size-[7px] rounded-[2px]" style={{ backgroundColor: INFRASTRUCTURE_COLORS[t] }} />
                    {INFRASTRUCTURE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="point-status" className={labelClass}>
              Status
            </Label>
            <Select
              value={status}
              onValueChange={(value) => form.setValue("status", value as EditableStatus, { shouldDirty: true })}
            >
              <SelectTrigger id="point-status" size="sm" className="!h-8 w-full px-2 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    <span className="size-1.5 rounded-full" style={{ backgroundColor: INFRASTRUCTURE_STATUS_COLORS[s] }} />
                    {INFRASTRUCTURE_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <div className="flex items-center">
            <legend className={cn(labelClass, "flex-1")}>Location</legend>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 px-2 font-mono text-[10px]"
              onClick={useCurrentLocation}
              disabled={isLocating || isSubmitting}
            >
              {isLocating ? <Loader2 className="size-3 animate-spin" /> : <LocateFixed className="size-3" />}
              {isLocating ? "LOCATING…" : "USE MY LOCATION"}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="point-latitude" className="sr-only">
                Latitude
              </Label>
              <Input
                id="point-latitude"
                type="number"
                step="any"
                inputMode="decimal"
                placeholder="Lat 44.3710"
                aria-invalid={!!errors.latitude}
                className="h-8 font-mono text-[13px]"
                {...form.register("latitude", { valueAsNumber: true })}
              />
              <FieldError message={errors.latitude?.message} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="point-longitude" className="sr-only">
                Longitude
              </Label>
              <Input
                id="point-longitude"
                type="number"
                step="any"
                inputMode="decimal"
                placeholder="Lon −72.9440"
                aria-invalid={!!errors.longitude}
                className="h-8 font-mono text-[13px]"
                {...form.register("longitude", { valueAsNumber: true })}
              />
              <FieldError message={errors.longitude?.message} />
            </div>
          </div>
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="point-notes" className={labelClass}>
            Notes
          </Label>
          <Textarea
            id="point-notes"
            rows={4}
            placeholder="Access, depth, landmarks…"
            className="min-h-0 text-[13px]"
            {...form.register("notes")}
          />
        </div>

        {!isEditing && (
          <p className="text-xs text-muted-foreground">You can add photos once the point is created.</p>
        )}
      </div>

      <div className="flex shrink-0 gap-2 border-t px-4 py-3">
        <Button
          type="submit"
          size="sm"
          className="h-7 px-2.5 text-xs"
          disabled={isSubmitting || (isEditing && !isDirty)}
        >
          {isSubmitting ? "Saving…" : isEditing ? "Save changes" : "Create point"}
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2.5 text-xs" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
