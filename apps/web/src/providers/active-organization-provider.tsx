"use client";

import { authClient } from "@/lib/auth/auth-client";
import { type ReactNode } from "react";

/**
 * Provider is now a pass-through as state is managed by better-auth.
 * Kept for backward compatibility with existing tree structure.
 */
export function ActiveOrganizationProvider({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}

/**
 * Hook to get and set the active organization ID using Better Auth.
 */
export function useActiveOrganizationId() {
  const { data: activeOrg, isPending } = authClient.useActiveOrganization();
  
  const setActiveOrganizationId = async (id: string | null) => {
    if (id) {
      await authClient.organization.setActive({
        organizationId: id,
      });
    } else {
      // Unset by calling setActive with null
      await authClient.organization.setActive({
        // Passing null to clear the active organization per Better Auth API
        organizationId: null,
      });
    }
  };

  return {
    activeOrganizationId: activeOrg?.id ?? null,
    setActiveOrganizationId,
    isLoading: isPending
  };
}

/**
 * Hook to retrieve the full details of the currently active organization.
 */
export function useActiveOrganization() {
  const { data, isPending, error } = authClient.useActiveOrganization();
  
  const setActiveOrganizationId = async (id: string | null) => {
    if (id) {
      await authClient.organization.setActive({
        organizationId: id,
      });
    } else {
      // Unset by calling setActive with null
      await authClient.organization.setActive({
        organizationId: null,
      });
    }
  };

  return {
    data,
    isLoading: isPending,
    error,
    activeOrganizationId: data?.id ?? null,
    setActiveOrganizationId
  };
}
