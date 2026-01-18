"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateUser } from "@/lib/actions/users";
import { toast } from "sonner";
import type { Profile, UserRole } from "@/lib/types/database";

interface EditUserFormProps {
  user: Profile;
  isOwnAccount: boolean;
}

export function EditUserForm({ user, isOwnAccount }: EditUserFormProps) {
  const [name, setName] = useState(user.full_name || "");
  const [role, setRole] = useState<UserRole>(user.role);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const hasChanges = name !== (user.full_name || "") || role !== user.role;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await updateUser(user.id, {
        name,
        role: isOwnAccount ? undefined : role,
      });
      if (result.success) {
        toast.success("User updated successfully");
        router.push("/dashboard/admin/users");
      } else {
        toast.error(result.error || "Failed to update user");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Details</CardTitle>
        <CardDescription>View and update user information</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user.email} disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              placeholder="Enter name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            {isOwnAccount ? (
              <>
                <Input id="role" value={role} disabled />
                <p className="text-sm text-slate-500">
                  You cannot change your own role
                </p>
              </>
            ) : (
              <Select
                value={role}
                onValueChange={(value) => setRole(value as UserRole)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member (view only)</SelectItem>
                  <SelectItem value="editor">Editor (add/edit data)</SelectItem>
                  <SelectItem value="admin">Admin (full access)</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label>Joined</Label>
            <Input
              value={new Date(user.created_at).toLocaleDateString()}
              disabled
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !hasChanges}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
