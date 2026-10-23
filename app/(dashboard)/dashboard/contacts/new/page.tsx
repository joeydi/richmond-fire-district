import { redirect } from "next/navigation";

// Contacts are created in the side sheet on the list; keep old links working
export default function NewContactPage() {
  redirect("/dashboard/contacts?contact=new");
}
