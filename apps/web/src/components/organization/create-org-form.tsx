"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActiveOrganizationId } from "@/providers/active-organization-provider";
import { toast } from "sonner";

export function CreateOrgForm({ onSuccess }: { onSuccess?: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setActiveOrganizationId } = useActiveOrganizationId();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await authClient.organization.create({
        name,
        slug,
      });

      if (error) {
        toast.error(error.message || "Failed to create organization");
        return;
      }

      if (data) {
        toast.success("Organization created successfully");
        setActiveOrganizationId(data.id);
        setName("");
        setSlug("");
        router.refresh();
        onSuccess?.();
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="org-name">Organization Name</Label>
        <Input
          id="org-name"
          placeholder="My Awesome Organization"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            // Auto-generate slug from name if slug is empty or matches previous auto-gen
            if (!slug || slug === name.toLowerCase().replace(/\s+/g, "-").slice(0, -1)) {
                setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"));
            }
          }}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="org-slug">Slug</Label>
        <Input
          id="org-slug"
          placeholder="my-awesome-org"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creating..." : "Create Organization"}
      </Button>
    </form>
  );
}
