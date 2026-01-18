"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  acceptInterpolatedMeterReading,
  acceptInterpolatedChlorineReading,
} from "@/lib/actions/reports";

interface AcceptValueButtonProps {
  type: "meter" | "chlorine";
  date: string;
  value: number;
  meterId?: string;
}

export function AcceptValueButton({
  type,
  date,
  value,
  meterId,
}: AcceptValueButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleAccept = () => {
    startTransition(async () => {
      const result =
        type === "meter"
          ? await acceptInterpolatedMeterReading({
              date,
              meterId: meterId!,
              value,
            })
          : await acceptInterpolatedChlorineReading({
              date,
              value,
            });

      if (result.success) {
        toast.success("Reading saved successfully");
      } else {
        toast.error(result.error || "Failed to save reading");
      }
    });
  };

  const isDisabled = isPending || (type === "meter" && !meterId);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleAccept}
      disabled={isDisabled}
      title={
        isDisabled && !isPending
          ? "Select a specific meter to accept"
          : "Accept this estimated value"
      }
      className="h-6 w-6 p-0"
    >
      <Check className="h-4 w-4 text-green-600" />
    </Button>
  );
}
