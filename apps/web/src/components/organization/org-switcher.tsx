"use client";

import { authClient } from "@/lib/auth/auth-client";
import { useActiveOrganizationId } from "@/providers/active-organization-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CreateOrgForm } from "./create-org-form";

export function OrgSwitcher() {
  const { data: organizations } = authClient.useListOrganizations();
  const { activeOrganizationId, setActiveOrganizationId } = useActiveOrganizationId();
  const [open, setOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const activeOrg = organizations?.find((org) => org.id === activeOrganizationId);

  return (
    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[200px] justify-between"
          >
            {activeOrg ? activeOrg.name : "Select Organization"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[200px]">
          <DropdownMenuLabel>Organizations</DropdownMenuLabel>
          {organizations?.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onSelect={() => {
                setActiveOrganizationId(org.id);
                setOpen(false);
              }}
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  activeOrganizationId === org.id ? "opacity-100" : "opacity-0"
                )}
              />
              {org.name}
            </DropdownMenuItem>
          ))}
          {organizations?.length === 0 && (
             <div className="p-2 text-sm text-muted-foreground text-center">No organizations found</div>
          )}
          <DropdownMenuSeparator />
          <DialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Organization
            </DropdownMenuItem>
          </DialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
        </DialogHeader>
        <CreateOrgForm onSuccess={() => setShowCreateDialog(false)} />
      </DialogContent>
    </Dialog>
  );
}
