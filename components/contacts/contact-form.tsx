"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { createContact, updateContact, type Contact, type ContactType } from "@/lib/actions/contacts";
import { contactTypeDots, contactTypeLabels } from "./contact-types";

const TYPES = ["resident", "business", "contractor", "utility", "emergency", "other"] as const satisfies readonly ContactType[];

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
  contact_type: z.enum(TYPES),
  phone: z
    .string()
    .trim()
    .regex(/^[\d\s\-\(\)\+\.]*$/, "Use digits, spaces and ( ) - + . only")
    .max(50),
  email: z.union([z.literal(""), z.email("Enter a valid email address").max(255)]),
  address: z.string().trim().max(500),
  notes: z.string().max(2000),
});

type FormData = z.infer<typeof formSchema>;

const labelClass = "font-mono text-[10px] font-normal tracking-[0.08em] text-muted-foreground uppercase";

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-red-600">{message}</p> : null;
}

interface ContactFormProps {
  /** Omit to create a new contact */
  contact?: Contact | null;
  onCancel: () => void;
  /** Called with the saved contact's id */
  onSaved: (id: string) => void;
}

/** Edit or create form for the contacts side sheet */
export function ContactForm({ contact, onCancel, onSaved }: ContactFormProps) {
  const isEditing = !!contact;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: contact?.name ?? "",
      contact_type: contact?.contact_type ?? "resident",
      phone: contact?.phone ?? "",
      email: contact?.email ?? "",
      address: contact?.address ?? "",
      notes: contact?.notes ?? "",
    },
  });
  const { errors, isSubmitting, isDirty } = form.formState;
  const contactType = useWatch({ control: form.control, name: "contact_type" });

  const onSubmit = async (data: FormData) => {
    const input = {
      name: data.name,
      contact_type: data.contact_type,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      notes: data.notes.trim() || null,
    };
    const result = isEditing
      ? { ...(await updateContact(contact.id, input)), id: contact.id }
      : await createContact(input);
    const { id } = result;
    if (!result.success || !id) {
      toast.error(result.error ?? "Could not save contact");
      return;
    }
    toast.success(isEditing ? "Contact updated" : "Contact created");
    onSaved(id);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex h-full flex-col">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-3.5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contact-name" className={labelClass}>
            Name
          </Label>
          <Input
            id="contact-name"
            placeholder="e.g. Jane Smith"
            autoFocus={!isEditing}
            aria-invalid={!!errors.name}
            className="h-8 text-[13px]"
            {...form.register("name")}
          />
          <FieldError message={errors.name?.message} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contact-type" className={labelClass}>
            Type
          </Label>
          <Select
            value={contactType}
            onValueChange={(value) => form.setValue("contact_type", value as ContactType, { shouldDirty: true })}
          >
            <SelectTrigger id="contact-type" size="sm" className="!h-8 w-full px-2 text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  <span className={cn("size-1.5 rounded-full", contactTypeDots[t])} />
                  {contactTypeLabels[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contact-phone" className={labelClass}>
              Phone
            </Label>
            <Input
              id="contact-phone"
              type="tel"
              autoComplete="off"
              placeholder="(802) 555-0123"
              aria-invalid={!!errors.phone}
              className="h-8 font-mono text-[13px]"
              {...form.register("phone")}
            />
            <FieldError message={errors.phone?.message} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contact-email" className={labelClass}>
              Email
            </Label>
            <Input
              id="contact-email"
              type="email"
              autoComplete="off"
              placeholder="name@example.com"
              aria-invalid={!!errors.email}
              className="h-8 font-mono text-[13px]"
              {...form.register("email")}
            />
            <FieldError message={errors.email?.message} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contact-address" className={labelClass}>
            Address
          </Label>
          <Input
            id="contact-address"
            autoComplete="off"
            placeholder="e.g. 66 Robbins Mtn Rd"
            aria-invalid={!!errors.address}
            className="h-8 text-[13px]"
            {...form.register("address")}
          />
          <FieldError message={errors.address?.message} />
          <p className="text-xs text-muted-foreground">Links the contact to infrastructure named for this address.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contact-notes" className={labelClass}>
            Notes
          </Label>
          <Textarea
            id="contact-notes"
            rows={4}
            placeholder="Gate codes, best time to call, who to ask for…"
            aria-invalid={!!errors.notes}
            className="min-h-0 text-[13px]"
            {...form.register("notes")}
          />
          <FieldError message={errors.notes?.message} />
        </div>
      </div>

      <div className="flex shrink-0 gap-2 border-t px-4 py-3">
        <Button
          type="submit"
          size="sm"
          className="h-7 px-2.5 text-xs"
          disabled={isSubmitting || (isEditing && !isDirty)}
        >
          {isSubmitting ? "Saving…" : isEditing ? "Save changes" : "Create contact"}
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2.5 text-xs" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
