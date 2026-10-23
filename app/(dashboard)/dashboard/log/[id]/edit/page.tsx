import { redirect } from "next/navigation";

interface EditLogPostPageProps {
  params: Promise<{ id: string }>;
}

// Posts are edited in the side sheet on the log page; keep old links working
export default async function EditLogPostPage({ params }: EditLogPostPageProps) {
  const { id } = await params;
  redirect(`/dashboard/log?compose=${id}`);
}
