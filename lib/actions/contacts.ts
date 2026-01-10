"use server";

import { createClient } from "@/lib/supabase/server";
import { requireEditor } from "@/lib/auth/roles";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Contact types
export type ContactType =
  | "resident"
  | "business"
  | "contractor"
  | "utility"
  | "emergency"
  | "other";

export interface Contact {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  contact_type: ContactType;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Validation schema
const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  address: z.string().max(500).optional().nullable(),
  phone: z
    .string()
    .regex(/^[\d\s\-\(\)\+\.]*$/, "Invalid phone number format")
    .max(50)
    .optional()
    .nullable()
    .transform((val) => val || null),
  email: z
    .string()
    .email("Invalid email format")
    .max(255)
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => val || null),
  contact_type: z.enum([
    "resident",
    "business",
    "contractor",
    "utility",
    "emergency",
    "other",
  ]),
  notes: z.string().max(2000).optional().nullable(),
});

export type ContactInput = z.infer<typeof contactSchema>;

interface GetContactsOptions {
  search?: string;
  sortBy?: keyof Contact;
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

/**
 * Get all contacts with optional search and sorting
 */
export async function getContacts(options: GetContactsOptions = {}): Promise<{
  data: Contact[];
  count: number;
}> {
  const {
    search,
    sortBy = "name",
    sortOrder = "asc",
    limit = 50,
    offset = 0,
  } = options;

  const supabase = await createClient();

  let query = supabase
    .from("contacts")
    .select("*", { count: "exact" });

  // Apply search filter
  if (search) {
    query = query.or(
      `name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,address.ilike.%${search}%`
    );
  }

  // Apply sorting
  query = query.order(sortBy, { ascending: sortOrder === "asc" });

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching contacts:", error);
    return { data: [], count: 0 };
  }

  return { data: data ?? [], count: count ?? 0 };
}

/**
 * Get a single contact by ID
 */
export async function getContact(id: string): Promise<Contact | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching contact:", error);
    return null;
  }

  return data;
}

/**
 * Create a new contact
 */
export async function createContact(
  input: ContactInput
): Promise<{ success: boolean; error?: string; id?: string }> {
  await requireEditor();

  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      name: parsed.data.name,
      address: parsed.data.address || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      contact_type: parsed.data.contact_type,
      notes: parsed.data.notes || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating contact:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/contacts");
  return { success: true, id: data.id };
}

/**
 * Update an existing contact
 */
export async function updateContact(
  id: string,
  input: ContactInput
): Promise<{ success: boolean; error?: string }> {
  await requireEditor();

  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("contacts")
    .update({
      name: parsed.data.name,
      address: parsed.data.address || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      contact_type: parsed.data.contact_type,
      notes: parsed.data.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating contact:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/contacts");
  revalidatePath(`/dashboard/contacts/${id}/edit`);
  return { success: true };
}

/**
 * Delete a contact
 */
export async function deleteContact(
  id: string
): Promise<{ success: boolean; error?: string }> {
  await requireEditor();

  const supabase = await createClient();

  const { error } = await supabase.from("contacts").delete().eq("id", id);

  if (error) {
    console.error("Error deleting contact:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/contacts");
  return { success: true };
}

/**
 * Get contact type options for dropdowns
 */
export async function getContactTypeOptions(): Promise<
  { value: ContactType; label: string }[]
> {
  return [
    { value: "resident", label: "Resident" },
    { value: "business", label: "Business" },
    { value: "contractor", label: "Contractor" },
    { value: "utility", label: "Utility" },
    { value: "emergency", label: "Emergency" },
    { value: "other", label: "Other" },
  ];
}
