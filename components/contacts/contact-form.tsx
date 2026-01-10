"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  createContact,
  updateContact,
  type Contact,
  type ContactType,
} from "@/lib/actions/contacts";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  address: z.string().max(500).optional(),
  phone: z
    .string()
    .regex(/^[\d\s\-\(\)\+\.]*$/, "Invalid phone number format")
    .max(50)
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .email("Invalid email format")
    .max(255)
    .optional()
    .or(z.literal("")),
  contact_type: z.enum([
    "resident",
    "business",
    "contractor",
    "utility",
    "emergency",
    "other",
  ]),
  notes: z.string().max(2000).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ContactFormProps {
  contact?: Contact;
  contactTypes: { value: ContactType; label: string }[];
}

export function ContactForm({ contact, contactTypes }: ContactFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!contact;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: contact?.name || "",
      address: contact?.address || "",
      phone: contact?.phone || "",
      email: contact?.email || "",
      contact_type: contact?.contact_type || "resident",
      notes: contact?.notes || "",
    },
  });

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const input = {
        name: values.name,
        address: values.address || null,
        phone: values.phone || null,
        email: values.email || null,
        contact_type: values.contact_type,
        notes: values.notes || null,
      };

      const result = isEditing
        ? await updateContact(contact.id, input)
        : await createContact(input);

      if (result.success) {
        toast.success(
          isEditing ? "Contact updated successfully" : "Contact created successfully"
        );
        router.push("/dashboard/contacts");
      } else {
        toast.error(result.error || "An error occurred");
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contact_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Type *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {contactTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="(555) 123-4567"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input placeholder="123 Main St, Richmond, VT 05477" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Additional notes about this contact..."
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-4">
          <Button type="submit" disabled={isPending}>
            {isPending
              ? isEditing
                ? "Saving..."
                : "Creating..."
              : isEditing
                ? "Save Changes"
                : "Create Contact"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/contacts")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
