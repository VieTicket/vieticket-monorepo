"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { useActiveOrganizationId } from "@/providers/active-organization-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function MembersManagement() {
  const { activeOrganizationId } = useActiveOrganizationId();
  
  const {
    data: members,
    isPending: isLoadingMembers,
    error: membersError,
  } = useQuery({
    queryKey: ["members", activeOrganizationId],
    queryFn: async () => {
        if (!activeOrganizationId) return { members: [], total: 0 };
        const { data, error } = await authClient.organization.listMembers({
            query: {
                organizationId: activeOrganizationId
            }
        });
        if (error) throw error;
        return data;
    },
    enabled: !!activeOrganizationId,
  });
  
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [isInviting, setIsInviting] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  if (!activeOrganizationId) {
    return <div>Please select an organization to manage members.</div>;
  }

  if (isLoadingMembers) {
    return <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>;
  }

  if (membersError) {
    return <div className="text-red-500">Error loading members: {membersError.message}</div>;
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    try {
      const { error } = await authClient.organization.inviteMember({
        email: inviteEmail,
        role: inviteRole as "member", // Type assertion
        organizationId: activeOrganizationId,
      });

      if (error) {
        toast.error(error.message || "Failed to invite member");
      } else {
        toast.success("Invitation sent successfully");
        setInviteEmail("");
        setIsInviteDialogOpen(false);
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    
    try {
        const { error } = await authClient.organization.removeMember({
            memberIdOrEmail: memberId,
            organizationId: activeOrganizationId
        });
        
        if (error) {
            toast.error(error.message);
        } else {
            toast.success("Member removed");
        }
    } catch (err) {
        toast.error("Failed to remove member");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Members</h2>
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button>Invite Member</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Member</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={isInviting}>
                {isInviting ? "Sending Invitation..." : "Send Invitation"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members?.members?.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.user.image || ""} />
                    <AvatarFallback>{member.user.name?.charAt(0) || member.user.email?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium">{member.user.name}</span>
                    <span className="text-xs text-muted-foreground">{member.user.email}</span>
                  </div>
                </TableCell>
                <TableCell className="capitalize">{member.role}</TableCell>
                <TableCell>{new Date(member.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        className="text-red-600 focus:text-red-600"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove Member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
