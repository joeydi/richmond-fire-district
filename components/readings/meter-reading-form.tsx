"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, ChevronDown, Droplets } from "lucide-react";
import { CameraCapture } from "./camera-capture";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { insertMeterReading } from "@/lib/actions/readings";
import { toast } from "sonner";

interface Meter {
  id: string;
  name: string;
}

interface MeterReadingFormProps {
  meters: Meter[];
  lastReadings: Record<string, number | null>;
}

export function MeterReadingForm({ meters, lastReadings }: MeterReadingFormProps) {
  const [meterId, setMeterId] = useState(meters[0].id ?? '');
  const lastReading = lastReadings[meters[0]?.id];
  const [readingValue, setReadingValue] = useState('');
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedAt, setCapturedAt] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<"close" | "retake" | null>(
    null
  );
  const router = useRouter();

  const handleCaptured = (dataUrl: string, ts: string) => {
    setCapturedImage(dataUrl);
    setCapturedAt(ts);
  };

  const doRetake = () => {
    setCapturedImage(null);
    setCapturedAt(null);
  };

  const closeCamera = () => {
    setShowCamera(false);
    setCapturedImage(null);
    setCapturedAt(null);
  };

  // Leaving a displayed capture clears its timestamp. If the user has entered a
  // value (read from the photo), confirm first so the timestamp isn't lost.
  const requestClose = () => {
    if (capturedImage && readingValue) {
      setConfirmAction("close");
    } else {
      closeCamera();
    }
  };

  const requestRetake = () => {
    if (capturedImage && readingValue) {
      setConfirmAction("retake");
    } else {
      doRetake();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await insertMeterReading({
        meterId,
        readingValue: parseFloat(readingValue),
        recordedAt: capturedAt || new Date().toISOString(),
        notes: notes || undefined,
      });

      if (result.success) {
        toast.success("Reading recorded successfully");
        setReadingValue("");
        setNotes("");
        setCapturedAt(null);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to record reading");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Meter Reading</CardTitle>
        <div className="rounded-full bg-blue-100 p-2 text-blue-600">
          <Droplets className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="meter" className="text-base">
              Meter
            </Label>
            <Select value={meterId} onValueChange={setMeterId} required>
              <SelectTrigger className="h-14 text-lg">
                <SelectValue placeholder="Select a meter" />
              </SelectTrigger>
              <SelectContent>
                {meters.map((meter) => (
                  <SelectItem key={meter.id} value={meter.id} className="text-lg py-3">
                    {meter.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="reading" className="text-base">
                Reading Value (gallons)
              </Label>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => (showCamera ? requestClose() : setShowCamera(true))}
                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <Camera className="h-8 w-8" />
              </Button>
            </div>
            <Input
              id="reading"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder={lastReading != null ? lastReading.toLocaleString() : "0.00"}
              value={readingValue}
              onChange={(e) => setReadingValue(e.target.value)}
              required
              disabled={loading}
              className="h-16 text-2xl font-mono text-center"
            />
            {showCamera && (
              <CameraCapture
                capturedImage={capturedImage}
                onCapture={handleCaptured}
                onRequestRetake={requestRetake}
                onRequestClose={requestClose}
              />
            )}
          </div>

          <Collapsible>
            <CollapsibleTrigger className="flex w-full items-center justify-between text-base font-medium text-slate-700">
              Notes
              <ChevronDown className="h-4 w-4 transition-transform [[data-state=open]>svg]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <Textarea
                id="notes"
                placeholder="Add any notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={loading}
                className="min-h-[100px] text-base"
              />
            </CollapsibleContent>
          </Collapsible>

          <Button
            type="submit"
            disabled={loading || !meterId || !readingValue}
            className="h-14 w-full text-lg"
          >
            {loading ? "Recording..." : "Record Reading"}
          </Button>
        </form>
      </CardContent>
    </Card>

    <AlertDialog
      open={confirmAction !== null}
      onOpenChange={(open) => {
        if (!open) setConfirmAction(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard the capture time?</AlertDialogTitle>
          <AlertDialogDescription>
            You&apos;ve entered a reading value from the captured image. Leaving
            this capture will clear its timestamp, so the reading would be saved
            with the current time instead.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (confirmAction === "close") {
                closeCamera();
              } else {
                doRetake();
              }
              setConfirmAction(null);
            }}
          >
            Discard
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
