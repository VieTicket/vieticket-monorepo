"use client";

import { MembersManagement } from "@/components/organization/members-management";
import { LeaveOrgButton } from "@/components/organization/leave-org-button";
import { useActiveOrganizationId } from "@/providers/active-organization-provider";
import { authClient } from "@/lib/auth/auth-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CreateOrgForm } from "@/components/organization/create-org-form";
import { useState, useEffect } from "react";
import { Plus, ArrowLeft } from "lucide-react";

export default function OrganizationPage() {
  const { activeOrganizationId, setActiveOrganizationId } = useActiveOrganizationId();
  const { data: organizations, isPending: isLoading } = authClient.useListOrganizations();
  const { data: session } = authClient.useSession();
  const t = useTranslations("organizer-dashboard.organization");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'details'>('list');
  
  const activeOrg = organizations?.find((org) => org.id === activeOrganizationId);

  useEffect(() => {
    if (activeOrganizationId) {
      setViewMode('details');
    } else {
      setViewMode('list');
    }
  }, [activeOrganizationId]);

  // Check if user is an organizer (owner candidate)
  // Note: The backend also enforces this, but we check here for UI visibility
  // Assuming 'organizer' role in user table means they can be an owner
  // You might need to adjust this check based on your exact role definition
  const canCreateOrg = session?.user?.role === "organizer";

  if (isLoading) {
    return <div className="p-8">Loading organization details...</div>;
  }

  if (viewMode === 'list') {
    return (
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          {canCreateOrg && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("createOrg")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("createOrg")}</DialogTitle>
                </DialogHeader>
                <CreateOrgForm onSuccess={() => setIsCreateDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          )}
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {organizations?.map((org) => (
            <Card key={org.id} className="hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => setActiveOrganizationId(org.id)}>
              <CardHeader>
                <CardTitle>{org.name}</CardTitle>
                <CardDescription>{org.slug}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="secondary" className="w-full">Manage</Button>
              </CardContent>
            </Card>
          ))}
          {(!organizations || organizations.length === 0) && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No organizations found. Create one to get started.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!activeOrg) return null;

  return (
    <div className="space-y-6 p-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setViewMode('list')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("settings")}</h1>
            <p className="text-muted-foreground">
              {t("settingsDesc")}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
            {canCreateOrg && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  {t("createOrg")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("createOrg")}</DialogTitle>
                </DialogHeader>
                <CreateOrgForm onSuccess={() => setIsCreateDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      
      <Separator />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("details")}</CardTitle>
            <CardDescription>
              {t("detailsDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="font-semibold">{t("name")}:</span> {activeOrg.name}
              </div>
              <div>
                <span className="font-semibold">{t("slug")}:</span> {activeOrg.slug}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("members")}</CardTitle>
            <CardDescription>
              {t("membersDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MembersManagement />
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">{t("dangerZone")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t("leaveOrg")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("leaveOrgDesc")}
                </p>
              </div>
              <LeaveOrgButton />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
