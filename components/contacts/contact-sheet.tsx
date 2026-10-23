"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getLogDateParts } from "@/components/log/log-dates";
import { INFRASTRUCTURE_COLORS } from "@/lib/types/infrastructure";
import type { ContactDetails } from "@/lib/actions/contacts";
import { contactTypeDots, contactTypeLabels } from "./contact-types";

interface ContactSheetProps {
  details: ContactDetails;
  canEdit: boolean;
  /** "12 / 43" */
  positionLabel: string | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
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

function QuickAction({
  href,
  icon: Icon,
  label,
  external,
}: {
  href: string | null;
  icon: typeof Phone;
  label: string;
  external?: boolean;
}) {
  const content = (
    <>
      <Icon className="size-4" strokeWidth={1.75} />
      <span className="text-xs">{label}</span>
    </>
  );
  const className = "h-12 flex-1 flex-col gap-0.5";
  if (!href) {
    return (
      <Button variant="outline" className={className} disabled>
        {content}
      </Button>
    );
  }
  return (
    <Button variant="outline" className={className} asChild>
      <a href={href} {...(external && { target: "_blank", rel: "noopener noreferrer" })}>
        {content}
      </a>
    </Button>
  );
}

function CopyRow({ label, value, href }: { label: string; value: string | null; href?: string }) {
  return (
    <div className="flex min-h-7 items-center gap-2">
      <dt className="w-16 shrink-0 font-mono text-[10px] tracking-[0.06em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 truncate font-mono text-xs">
        {value ? (
          href ? (
            <a href={href} className="underline-offset-2 hover:underline">
              {value}
            </a>
          ) : (
            value
          )
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </dd>
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="size-6 shrink-0 text-muted-foreground"
          onClick={() => {
            navigator.clipboard.writeText(value);
            toast.success(`${label[0]}${label.slice(1).toLowerCase()} copied`);
          }}
        >
          <Copy className="size-3" />
          <span className="sr-only">Copy {label.toLowerCase()}</span>
        </Button>
      )}
    </div>
  );
}

export function ContactSheet({
  details,
  canEdit,
  positionLabel,
  onClose,
  onPrev,
  onNext,
  onDelete,
}: ContactSheetProps) {
  const { contact, infrastructure, mentions, mentionTerms } = details;
  const phoneDigits = contact.phone?.replace(/[^\d+]/g, "") || null;
  const added = getLogDateParts(contact.created_at);
  const updated = getLogDateParts(contact.updated_at);

  return (
    <aside aria-label={`${contact.name} details`} className="flex h-full w-full flex-col bg-background">
      {/* Sheet toolbar */}
      <div className="flex h-11 shrink-0 items-center gap-1 border-b px-2 pl-3">
        <Button variant="outline" size="icon" className="size-7" onClick={onPrev} disabled={!onPrev} title="Previous contact (↑)">
          <ArrowUp className="size-3.5" />
          <span className="sr-only">Previous contact</span>
        </Button>
        <Button variant="outline" size="icon" className="size-7" onClick={onNext} disabled={!onNext} title="Next contact (↓)">
          <ArrowDown className="size-3.5" />
          <span className="sr-only">Next contact</span>
        </Button>
        <span className="ml-1.5 flex-1 font-mono text-[11px] text-muted-foreground">{positionLabel}</span>
        {canEdit && (
          <>
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" asChild>
              <Link href={`/dashboard/contacts/${contact.id}/edit`}>
                Edit <kbd className="ml-0.5">E</kbd>
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7 text-muted-foreground">
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">More actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-red-600 focus:text-red-600">
                  <Trash2 className="mr-2 size-4" />
                  Delete contact
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
        <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" onClick={onClose} title="Close (Esc)">
          <X className="size-4" />
          <span className="sr-only">Close details</span>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Title */}
        <div className="flex flex-col gap-1.5 px-4 pt-3.5 pb-3">
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.06em] text-zinc-700 uppercase">
            <span className={cn("size-1.5 rounded-full", contactTypeDots[contact.contact_type])} />
            {contactTypeLabels[contact.contact_type]}
          </span>
          <h2 className="text-[17px] font-semibold tracking-tight">{contact.name}</h2>
        </div>

        {/* Quick actions */}
        <div className="flex gap-1.5 px-4 pb-3.5">
          <QuickAction href={phoneDigits && `tel:${phoneDigits}`} icon={Phone} label="Call" />
          <QuickAction href={phoneDigits && `sms:${phoneDigits}`} icon={MessageSquare} label="Text" />
          <QuickAction href={contact.email && `mailto:${contact.email}`} icon={Mail} label="Email" />
        </div>

        {/* Details */}
        <section aria-label="Contact details" className="flex flex-col gap-1 border-t border-zinc-100 px-4 py-3">
          <dl className="flex flex-col">
            <CopyRow label="PHONE" value={contact.phone} href={phoneDigits ? `tel:${phoneDigits}` : undefined} />
            <CopyRow label="EMAIL" value={contact.email} href={contact.email ? `mailto:${contact.email}` : undefined} />
            <CopyRow label="ADDRESS" value={contact.address} />
          </dl>
          {contact.address && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 self-start rounded-md border px-2 py-1 font-mono text-[10px] hover:bg-accent"
            >
              DIRECTIONS ↗
            </a>
          )}
        </section>

        {/* Notes */}
        <section aria-label="Notes" className="flex flex-col gap-1.5 border-t border-zinc-100 px-4 py-3">
          <SectionLabel>Notes</SectionLabel>
          {contact.notes ? (
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{contact.notes}</p>
          ) : canEdit ? (
            <Link
              href={`/dashboard/contacts/${contact.id}/edit`}
              className="self-start text-xs text-muted-foreground hover:text-foreground"
            >
              No notes yet — <span className="underline">add one</span>
            </Link>
          ) : (
            <p className="text-xs text-muted-foreground">No notes</p>
          )}
        </section>

        {/* Related infrastructure */}
        <section aria-label="Infrastructure at this address" className="flex flex-col gap-1 border-t border-zinc-100 px-4 py-3">
          <SectionLabel aside={<span>{infrastructure.length}</span>}>Infrastructure at address</SectionLabel>
          {infrastructure.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {contact.address ? "No points named for this address" : "No address on file"}
            </p>
          ) : (
            <ul>
              {infrastructure.map((point) => (
                <li key={point.id}>
                  <Link
                    href={`/dashboard/infrastructure?point=${point.id}`}
                    className="-mx-1.5 flex h-7 items-center gap-2 rounded-md px-1.5 text-xs hover:bg-accent"
                  >
                    <span
                      className="size-[7px] shrink-0 rounded-[2px]"
                      style={{ backgroundColor: INFRASTRUCTURE_COLORS[point.type] }}
                    />
                    <span className="flex-1 truncate">{point.name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground uppercase">{point.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Log mentions */}
        <section aria-label="Mentioned in log" className="flex flex-col gap-1.5 border-t border-zinc-100 px-4 py-3">
          <SectionLabel aside={<span>{mentions.length}</span>}>Mentioned in log</SectionLabel>
          {mentions.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No posts mention {mentionTerms.map((t) => `“${t}”`).join(" or ")}
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
                    <mark className="rounded-[2px] bg-amber-100 px-0.5 text-inherit">{mention.match}</mark>
                    {mention.after}
                  </span>
                </Link>
              );
            })
          )}
        </section>

        <div className="border-t border-zinc-100 px-4 py-3 font-mono text-[10px] text-muted-foreground">
          ADDED {added.date} · UPDATED {updated.date}
        </div>
      </div>

      <div className="hidden h-9 shrink-0 items-center border-t px-4 font-mono text-[10px] text-muted-foreground lg:flex">
        ESC CLOSE · ↑↓ NAVIGATE{canEdit && " · E EDIT"}
      </div>
    </aside>
  );
}
