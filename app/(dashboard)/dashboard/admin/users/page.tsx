import { requireAdmin } from "@/lib/auth/roles";
import { getUsers } from "@/lib/actions/users";
import { UsersTable } from "./users-table";
import { InviteUserDialog } from "./invite-user-dialog";

export default async function UsersPage() {
  await requireAdmin();
  const users = await getUsers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage users and their roles
          </p>
        </div>
        <InviteUserDialog />
      </div>

      <UsersTable users={users} />
    </div>
  );
}
