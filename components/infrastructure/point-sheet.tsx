"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, MoreHorizontal, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InfrastructureImages } from "@/components/map/infrastructure-images";
import { getLogDateParts } from "@/components/log/log-dates";
import { PointMapPreview } from "./point-map-preview";
import {
  INFRASTRUCTURE_COLORS,
  INFRASTRUCTURE_LABELS,
  INFRASTRUCTURE_STATUS_COLORS,
  INFRASTRUCTURE_STATUS_LABELS,
} from "@/lib/types/infrastructure";
import type { InfrastructurePointDetails } from "@/lib/actions/infrastructure";

const NEAREST_LIMIT = 4;

interface PointSheetProps {
  details: InfrastructurePointDetails;
  isAdmin: boolean;
  /** "10 / 27" */
  positionLabel: string | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onSelect: (id: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}

function SectionLabel({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
      <span className="flex-1">{children}</span>
      {aside}
    </div>
  );
}

export function PointSheet({
  details,
  isAdmin,
  positionLabel,
  onClose,
  onPrev,
  onNext,
  onSelect,
  onEdit,
  onDelete,
}: PointSheetProps) {
  const { point, nearby, mentions } = details;
  const coords = `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`;
  const properties = Object.entries(point.properties ?? {}).filter(
    ([, value]) => value !== null && value !== ""
  );

  const copyCoords = () => {
    navigator.clipboard.writeText(coords);
    toast.success("Coordinates copied");
  };

  return (
    <aside
      aria-label={`${point.name} details`}
      className="flex h-full w-full flex-col bg-background"
    >
      {/* Sheet toolbar */}
      <div className="flex h-11 shrink-0 items-center gap-1 border-b px-2 pl-3">
        <Button
          variant="outline"
          size="icon"
          className="size-7"
          onClick={onPrev}
          disabled={!onPrev}
          title="Previous point (↑)"
        >
          <ArrowUp className="size-3.5" />
          <span className="sr-only">Previous point</span>
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-7"
          onClick={onNext}
          disabled={!onNext}
          title="Next point (↓)"
        >
          <ArrowDown className="size-3.5" />
          <span className="sr-only">Next point</span>
        </Button>
        <span className="ml-1.5 flex-1 font-mono text-[11px] text-muted-foreground">
          {positionLabel}
        </span>
        {isAdmin && (
          <>
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={onEdit}>
              Edit <kbd className="ml-0.5">E</kbd>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7 text-muted-foreground">
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">More actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={onDelete}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete point
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground"
          onClick={onClose}
          title="Close (Esc)"
        >
          <X className="size-4" />
          <span className="sr-only">Close details</span>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Title */}
        <div className="flex flex-col gap-1.5 px-4 pt-3.5 pb-3">
          <div className="flex items-center gap-3 font-mono text-[10px] tracking-[0.06em] text-zinc-700 uppercase">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="size-[7px] rounded-[2px]"
                style={{ backgroundColor: INFRASTRUCTURE_COLORS[point.type] }}
              />
              {INFRASTRUCTURE_LABELS[point.type]}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="size-1.5 rounded-full"
                style={{ backgroundColor: INFRASTRUCTURE_STATUS_COLORS[point.status] }}
              />
              {INFRASTRUCTURE_STATUS_LABELS[point.status]}
            </span>
          </div>
          <h2 className="text-[17px] font-semibold tracking-tight">{point.name}</h2>
        </div>

        {/* Location */}
        <div className="flex flex-col gap-2 px-4 pb-3.5">
          <PointMapPreview point={point} nearby={nearby} />
          <div className="flex items-center gap-1.5">
            <span className="flex-1 font-mono text-xs">{coords}</span>
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 font-mono text-[10px]"
              onClick={copyCoords}
            >
              COPY
            </Button>
            <Button variant="outline" size="sm" className="h-6 px-2 font-mono text-[10px]" asChild>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${point.latitude},${point.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                DIRECTIONS ↗
              </a>
            </Button>
          </div>
        </div>

        {/* Photos */}
        <section aria-label="Photos" className="flex flex-col gap-2 border-t border-zinc-100 px-4 py-3">
          <SectionLabel>Photos</SectionLabel>
          <InfrastructureImages key={point.id} infrastructurePointId={point.id} isAdmin={isAdmin} />
        </section>

        {/* Notes */}
        <section aria-label="Notes" className="flex flex-col gap-1.5 border-t border-zinc-100 px-4 py-3">
          <SectionLabel>Notes</SectionLabel>
          {point.notes ? (
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{point.notes}</p>
          ) : isAdmin ? (
            <button
              type="button"
              onClick={onEdit}
              className="self-start text-xs text-muted-foreground hover:text-foreground"
            >
              No notes yet — <span className="underline">add one</span>
            </button>
          ) : (
            <p className="text-xs text-muted-foreground">No notes</p>
          )}
        </section>

        {/* Custom properties */}
        {properties.length > 0 && (
          <section aria-label="Properties" className="flex flex-col gap-1.5 border-t border-zinc-100 px-4 py-3">
            <SectionLabel>Properties</SectionLabel>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-xs">
              {properties.map(([key, value]) => (
                <div key={key} className="contents">
                  <dt className="font-mono text-muted-foreground">{key}</dt>
                  <dd className="truncate">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* Nearest */}
        {nearby.length > 0 && (
          <section aria-label="Nearest points" className="flex flex-col gap-1 border-t border-zinc-100 px-4 py-3">
            <SectionLabel aside={<span>Dist · Brg</span>}>Nearest</SectionLabel>
            <ul>
              {nearby.slice(0, NEAREST_LIMIT).map((other) => (
                <li key={other.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(other.id)}
                    className="-mx-1.5 flex h-7 w-[calc(100%+0.75rem)] items-center gap-2 rounded-md px-1.5 text-left hover:bg-accent"
                  >
                    <span
                      className="size-[7px] shrink-0 rounded-[2px]"
                      style={{ backgroundColor: INFRASTRUCTURE_COLORS[other.type] }}
                    />
                    <span className="min-w-0 flex-1 truncate text-xs">{other.name}</span>
                    <span className="font-mono text-[11px] text-zinc-700">
                      {Math.round(other.distanceM)} m
                    </span>
                    <span className="w-8 text-right font-mono text-[11px] text-muted-foreground">
                      {other.bearing}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Log mentions */}
        <section aria-label="Mentioned in log" className="flex flex-col gap-1.5 border-t border-zinc-100 px-4 py-3">
          <SectionLabel aside={<span>{mentions.length}</span>}>Mentioned in log</SectionLabel>
          {mentions.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No posts mention “{details.mentionTerm}”
            </p>
          ) : (
            mentions.map((mention) => {
              const { date, time } = getLogDateParts(mention.created_at);
              return (
                <Link
                  key={mention.id}
                  href={`/dashboard/log/${mention.id}`}
                  className="flex flex-col gap-1 rounded-md border px-2.5 py-2 transition-colors hover:bg-zinc-50"
                >
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {date} {time} · {mention.authorName}
                  </span>
                  <span className="text-xs leading-relaxed">
                    {mention.before}
                    <mark className="rounded-[2px] bg-amber-100 px-0.5 text-inherit">
                      {mention.match}
                    </mark>
                    {mention.after}
                  </span>
                </Link>
              );
            })
          )}
        </section>
      </div>

      <div className="hidden h-9 shrink-0 items-center border-t px-4 font-mono text-[10px] text-muted-foreground lg:flex">
        ESC CLOSE · ↑↓ NAVIGATE{isAdmin && " · E EDIT"}
      </div>
    </aside>
  );
}
