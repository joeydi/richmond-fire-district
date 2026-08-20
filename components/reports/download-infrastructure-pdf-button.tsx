"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fetchImagesAsDataUrls } from "@/lib/pdf/prepare-images";
import { boundsForPoints } from "@/lib/pdf/map-bounds";
import { getParcelsByViewport } from "@/lib/actions/map";
import type { InfrastructureReportData } from "@/lib/actions/infrastructure-report";
import type { InfrastructurePoint } from "@/lib/types/infrastructure";

/**
 * Higher than the interactive map's 500, since the report fits its bounds to
 * every active point at once rather than to one viewport.
 */
const REPORT_PARCEL_LIMIT = 2000;

interface DownloadInfrastructurePdfButtonProps {
  data: InfrastructureReportData;
}

/**
 * Fetches parcels for the report's extent and captures the overview map.
 *
 * Returns null on any failure — a missing map degrades the report rather than
 * failing the download, which is how photo failures are handled too.
 */
async function renderOverviewMap(
  points: InfrastructurePoint[],
  toastId: string | number
): Promise<string | null> {
  const bounds = boundsForPoints(points);
  if (!bounds) return null;

  try {
    toast.loading("Loading parcels…", { id: toastId });
    const parcels = await getParcelsByViewport(bounds, REPORT_PARCEL_LIMIT);

    if (parcels.length >= REPORT_PARCEL_LIMIT) {
      console.warn(
        `Report map hit the parcel limit (${REPORT_PARCEL_LIMIT}); some boundaries are missing`
      );
    }

    toast.loading("Rendering map…", { id: toastId });
    const { captureReportMap } = await import("@/lib/pdf/capture-map");
    return await captureReportMap({ points, parcels, bounds });
  } catch (error) {
    console.error("Error rendering overview map:", error);
    return null;
  }
}

export function DownloadInfrastructurePdfButton({
  data,
}: DownloadInfrastructurePdfButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    const toastId = toast.loading("Preparing report…");

    try {
      const allPoints = data.groups.flatMap((group) => group.points);
      const mapImage = await renderOverviewMap(allPoints, toastId);

      // Inline the photos as data URLs so the PDF does not depend on signed URLs
      // that can expire part-way through rendering.
      const urls = data.groups.flatMap((group) =>
        group.points.flatMap((point) => point.images.map((image) => image.url))
      );

      const dataUrls = await fetchImagesAsDataUrls(urls, (completed, total) => {
        toast.loading(`Preparing photos (${completed} of ${total})…`, {
          id: toastId,
        });
      });

      const embedded: InfrastructureReportData = {
        ...data,
        groups: data.groups.map((group) => ({
          ...group,
          points: group.points.map((point) => ({
            ...point,
            images: point.images.flatMap((image) => {
              const dataUrl = dataUrls.get(image.url);
              return dataUrl ? [{ ...image, url: dataUrl }] : [];
            }),
          })),
        })),
      };
      embedded.totalImages = embedded.groups.reduce(
        (sum, group) =>
          sum +
          group.points.reduce((pointSum, p) => pointSum + p.images.length, 0),
        0
      );

      toast.loading("Building PDF…", { id: toastId });

      // Loaded on demand so the renderer stays out of the initial page bundle.
      const [{ pdf }, { InfrastructureReportDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./infrastructure-report-document"),
      ]);

      const blob = await pdf(
        <InfrastructureReportDocument data={embedded} mapImage={mapImage} />
      ).toBlob();

      const fileName = `infrastructure-report-${format(new Date(), "yyyy-MM-dd")}.pdf`;
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      link.click();
      // Revoking in the same tick can cancel the download in Safari.
      setTimeout(() => URL.revokeObjectURL(objectUrl), 0);

      const skipped = urls.length - embedded.totalImages;
      toast.success(
        skipped > 0
          ? `Report downloaded (${skipped} ${skipped === 1 ? "photo" : "photos"} could not be loaded)`
          : "Report downloaded",
        { id: toastId }
      );
    } catch (error) {
      console.error("Error generating infrastructure report:", error);
      toast.error("Could not generate report", { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={isGenerating || data.totalPoints === 0}
    >
      {isGenerating ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      {isGenerating ? "Generating…" : "Download PDF"}
    </Button>
  );
}
