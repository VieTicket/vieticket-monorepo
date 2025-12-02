"use client";

import { authClient } from "@/lib/auth/auth-client";
import { useActiveOrganization } from "@/providers/active-organization-provider";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function LeaveOrgButton() {
  const { activeOrganizationId, setActiveOrganizationId, data: activeOrganization, isLoading } = useActiveOrganization();
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const handleLeave = async () => {
    if (!activeOrganizationId) return;
    if (!confirm("Are you sure you want to leave this organization?")) return;

    try {
      const { error } = await authClient.organization.leave({
        organizationId: activeOrganizationId,
      });
      setActiveOrganizationId(null);

      if (error) {
        toast.error(error.message || "Failed to leave organization");
      } else {
        toast.success("Left organization successfully");
        router.refresh();
        router.push("/"); // Or wherever appropriate
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
    }
  };

  if (!activeOrganizationId) return null;

  const currentMember = activeOrganization?.members?.find((m) => m.userId === session?.user.id);
  const isOwner = (currentMember?.role as string) === "owner";

  return (
    <Button
      variant="destructive"
      onClick={handleLeave}
      disabled={isLoading || isOwner}
      title={isOwner ? "Owners cannot leave the organization" : undefined}
    >
      Leave Organization
    </Button>
  );
}
