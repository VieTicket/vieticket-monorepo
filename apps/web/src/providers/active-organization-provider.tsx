"use client";

import { authClient } from "@/lib/auth/auth-client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type ActiveOrgContextValue = {
  activeOrganizationId: string | null;
  setActiveOrganizationId: (id: string | null) => void;
};

const ActiveOrgContext = createContext<ActiveOrgContextValue | undefined>(
  undefined,
);

const STORAGE_KEY = "vt_active_org_id";

/**
 * Provider to manage the active organization state on the client side.
 *
 * This provider persists the active organization ID in localStorage so that it survives page reloads.
 * It does NOT sync with the server-side session active organization, as we are managing this state purely on the client.
 */
export function ActiveOrganizationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [activeOrganizationId, setActiveOrganizationIdState] = useState<
    string | null
  >(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const storedId = localStorage.getItem(STORAGE_KEY);
    if (storedId) {
      setActiveOrganizationIdState(storedId);
    }
    setIsInitialized(true);
  }, []);

  const setActiveOrganizationId = (id: string | null) => {
    setActiveOrganizationIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  if (!isInitialized) {
    return null; // or a loading spinner
  }

  return (
    <ActiveOrgContext.Provider
      value={{ activeOrganizationId, setActiveOrganizationId }}
    >
      {children}
    </ActiveOrgContext.Provider>
  );
}

/**
 * Hook to get and set the active organization ID.
 *
 * Use this hook when you need to switch the active organization or check which ID is currently active.
 *
 * @throws {Error} If used outside of an `ActiveOrganizationProvider`.
 */
export function useActiveOrganizationId(): ActiveOrgContextValue {
  const context = useContext(ActiveOrgContext);
  if (context === undefined) {
    throw new Error(
      "useActiveOrganizationId must be used within an ActiveOrganizationProvider",
    );
  }
  return context;
}

/**
 * Hook to retrieve the full details of the currently active organization.
 *
 * This hook combines the local active ID state with Better Auth's data fetching to return the full organization object.
 * It automatically handles loading states and returns `null` if no organization is active or found.
 *
 * @returns An object containing:
 * - `data`: The active `Organization` object or `null`.
 * - `isLoading`: Boolean indicating if the organization list is loading.
 * - `activeOrganizationId`: The current active organization ID string.
 */
export function useActiveOrganization() {
  const { activeOrganizationId } = useActiveOrganizationId();
  
  const { data: organizations, isPending: isLoadingList } = authClient.useListOrganizations();
  
  // We derive the active organization from the list to ensure we have up-to-date data
  // and to avoid making a separate network request if we already have the list.
  // Alternatively, we could use authClient.organization.getFullOrganization if we need more details.
  const activeOrganization = organizations?.find(org => org.id === activeOrganizationId) ?? null;

  return {
    data: activeOrganization,
    isLoading: isLoadingList,
    activeOrganizationId
  };
}
