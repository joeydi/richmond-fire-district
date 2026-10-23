import { cache } from "react";
import { requireAdmin } from "@/lib/auth/roles";
import { getUserActivity, getUsers } from "@/lib/actions/users";
import { UsersTable } from "./users-table";

const getRequestTime = cache(() => Date.now());

export default async function UsersPage() {
  const admin = await requireAdmin();
  const [users, activity] = await Promise.all([getUsers(), getUserActivity()]);

  return <UsersTable users={users} activity={activity} currentUserId={admin.id} now={getRequestTime()} />;
}
