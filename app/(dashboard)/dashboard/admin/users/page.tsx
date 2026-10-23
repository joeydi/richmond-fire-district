import { cache } from "react";
import { requireAdmin } from "@/lib/auth/roles";
import { getUserActivity, getUsers } from "@/lib/actions/users";
import { UsersView } from "./users-view";

const getRequestTime = cache(() => Date.now());

interface UsersPageProps {
  searchParams: Promise<{ user?: string }>;
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const admin = await requireAdmin();
  const [{ user }, users, activity] = await Promise.all([searchParams, getUsers(), getUserActivity()]);

  return (
    <UsersView
      users={users}
      activity={activity}
      currentUserId={admin.id}
      now={getRequestTime()}
      initialSelected={user ?? null}
    />
  );
}
