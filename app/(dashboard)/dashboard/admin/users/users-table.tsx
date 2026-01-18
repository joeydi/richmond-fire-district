"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Pencil } from "lucide-react";
import { sendInviteEmail } from "@/lib/actions/users";
import { toast } from "sonner";
import type { Profile } from "@/lib/types/database";

interface UsersTableProps {
  users: Profile[];
}

const roleBadgeVariant = {
  admin: "destructive",
  editor: "default",
  member: "secondary",
} as const;

export function UsersTable({ users }: UsersTableProps) {
  const [sendingInvite, setSendingInvite] = useState<string | null>(null);

  const handleSendInvite = async (userId: string) => {
    setSendingInvite(userId);
    try {
      const result = await sendInviteEmail(userId);
      if (result.success) {
        toast.success("Invite email sent successfully");
      } else {
        toast.error(result.error || "Failed to send invite");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setSendingInvite(null);
    }
  };

  return (
    <div className="rounded-md border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-slate-500">
                No users found
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.full_name || "—"}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant={roleBadgeVariant[user.role]}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(user.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSendInvite(user.id)}
                      disabled={sendingInvite === user.id}
                      title="Send invite email"
                    >
                      <Mail className="h-4 w-4" />
                      <span className="sr-only">Send invite</span>
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/dashboard/admin/users/${user.id}/edit`}>
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit user</span>
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
