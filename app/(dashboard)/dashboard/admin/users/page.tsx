import { requireAdmin } from "@/lib/auth/roles";
import { getUsers } from "@/lib/actions/users";
import { UsersTable } from "./users-table";
import { CreateUserDialog } from "./create-user-dialog";

export default async function UsersPage() {
  await requireAdmin();
  const users = await getUsers();

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <CreateUserDialog />
      </div>

      <UsersTable users={users} />
    </div>
  );
}
