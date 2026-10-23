import { redirect } from "next/navigation";

// Posts are written in the side sheet on the log page; keep old links working
export default function NewLogPostPage() {
  redirect("/dashboard/log?compose=new");
}
