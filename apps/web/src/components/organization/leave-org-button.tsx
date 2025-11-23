"use client";

import { authClient } from "@/lib/auth/auth-client";
import { useActiveOrganizationId } from "@/providers/active-organization-provider";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function LeaveOrgButton() {
  const { activeOrganizationId, setActiveOrganizationId } = useActiveOrganizationId();
  const router = useRouter();

  const handleLeave = async () => {
    if (!activeOrganizationId) return;
    if (!confirm("Are you sure you want to leave this organization?")) return;

    try {
      const { error } = await authClient.organization.leave({
        organizationId: activeOrganizationId,
      });

      if (error) {
        toast.error(error.message || "Failed to leave organization");
      } else {
        toast.success("Left organization successfully");
        setActiveOrganizationId(null);
        router.refresh();
        router.push("/"); // Or wherever appropriate
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
    }
  };

  if (!activeOrganizationId) return null;

  return (
    <Button variant="destructive" onClick={handleLeave}>
      Leave Organization
    </Button>
  );
}
