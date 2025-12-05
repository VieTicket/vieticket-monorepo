"use client";

import { authClient } from "@/lib/auth/auth-client";
import { useActiveOrganization } from "@/providers/active-organization-provider";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, PlusCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreateOrgForm } from "./create-org-form";

export function OrgSwitcher({ className }: { className?: string }) {
  const { data: organizations, isPending } = authClient.useListOrganizations();
  const { data: activeOrg, setActiveOrganizationId, isLoading } = useActiveOrganization();
  const [open, setOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Set default active organization to the first one when none is active
  useEffect(() => {
    if (!isPending && !isLoading && organizations && organizations.length > 0 && !activeOrg) {
      // Best-effort: set the first organization as active by default
      (async () => {
        try {
          await setActiveOrganizationId(organizations[0].id);
        } catch (error) {
          console.error("Failed to set default active organization:", error);
        }
      })();
    }
  }, [isPending, isLoading, organizations, activeOrg, setActiveOrganizationId]);

  const handleSelect = async (organizationId: string | null) => {
    try {
      await setActiveOrganizationId(organizationId);
      setOpen(false);
    } catch (error) {
      console.error("Failed to set active organization:", error);
    }
  };

  const handleCreateClick = () => {
    setOpen(false);
    setShowCreateDialog(true);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            className={cn("w-[200px] justify-between", className)}
            disabled={isPending || isLoading}
          >
            {isLoading || isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <span className="truncate">
                  {activeOrg ? activeOrg.name : "Select Organization"}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search organizations..." />
            <CommandList>
              <CommandEmpty>No organization found.</CommandEmpty>
              <CommandGroup heading="Organizations">
                {organizations?.map((org) => (
                  <CommandItem
                    key={org.id}
                    value={org.name}
                    onSelect={() => handleSelect(org.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        activeOrg?.id === org.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {org.name}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem onSelect={() => handleSelect(null)}>
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      !activeOrg ? "opacity-100" : "opacity-0"
                    )}
                  />
                  No Organization
                </CommandItem>
                <CommandItem onSelect={handleCreateClick}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Organization
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Organization</DialogTitle>
          </DialogHeader>
          <CreateOrgForm onSuccess={() => setShowCreateDialog(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

