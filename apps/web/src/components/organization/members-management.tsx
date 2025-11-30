"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { useActiveOrganizationId } from "@/providers/active-organization-provider";
import { inviteUserToOrganization } from "@/lib/org/actions";
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
import { toast } from "sonner";
import { Loader2, MoreHorizontal, Trash2, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslations } from "next-intl";

export function MembersManagement() {
  const { activeOrganizationId } = useActiveOrganizationId();
  const t = useTranslations("organizer-dashboard.organization");

  const {
    data: members,
    isPending: isLoadingMembers,
    error: membersError,
    refetch: refetchMembers,
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

  const {
    data: invitations,
    refetch: refetchInvitations
  } = useQuery({
    queryKey: ["invitations", activeOrganizationId],
    queryFn: async () => {
      if (!activeOrganizationId) return [];
      const { data, error } = await authClient.organization.listInvitations({
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
    return <div>{t("selectOrg")}</div>;
  }

  if (isLoadingMembers) {
    return <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>;
  }

  if (membersError) {
    return <div className="text-red-500">Error loading members: {membersError.message}</div>;
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!confirm(t("confirmInvite"))) return;

    setIsInviting(true);
    try {
      const result = await inviteUserToOrganization(inviteEmail, activeOrganizationId);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.message || t("invitationSent"));
        setInviteEmail("");
        setIsInviteDialogOpen(false);
        refetchInvitations();
        refetchMembers();
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm(t("confirmRemove"))) return;

    try {
      const { error } = await authClient.organization.removeMember({
        memberIdOrEmail: memberId,
        organizationId: activeOrganizationId
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Member removed");
        refetchMembers();
      }
    } catch (err) {
      toast.error("Failed to remove member");
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm(t("confirmCancel"))) return;
    try {
      const { error } = await authClient.organization.cancelInvitation({
        invitationId
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Invitation canceled");
        refetchInvitations();
      }
    } catch (err) {
      toast.error("Failed to cancel invitation");
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{t("members")}</h2>
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>{t("inviteMember")}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("inviteMember")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("email")}</label>
                  <Input
                    type="email"
                    placeholder="colleague@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("role")}</label>
                  <Input value="Member" disabled />
                  <p className="text-xs text-muted-foreground">
                    Only "Member" role can be invited.
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={isInviting}>
                  {isInviting ? t("sending") : t("sendInvitation")}
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
                          {t("removeMember")}
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

      {invitations && invitations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{t("invitations")}</h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("email")}</TableHead>
                  <TableHead>{t("role")}</TableHead>
                  <TableHead>Sent At</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>{invitation.email}</TableCell>
                    <TableCell className="capitalize">{invitation.role}</TableCell>
                    <TableCell>{new Date(invitation.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleCancelInvitation(invitation.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
