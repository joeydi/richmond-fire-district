import type { ContactType } from "@/lib/actions/contacts";

export const contactTypeLabels: Record<ContactType, string> = {
  resident: "Resident",
  business: "Business",
  contractor: "Contractor",
  utility: "Utility",
  emergency: "Emergency",
  other: "Other",
};

export const contactTypeDots: Record<ContactType, string> = {
  resident: "bg-blue-500",
  business: "bg-purple-500",
  contractor: "bg-orange-500",
  utility: "bg-green-600",
  emergency: "bg-red-600",
  other: "bg-zinc-400",
};
