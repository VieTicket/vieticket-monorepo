"use client";

import { authClient } from "@/lib/auth/auth-client";
import { useActiveOrganizationId } from "@/providers/active-organization-provider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"verifying" | "accepting" | "success" | "error">("verifying");
  const [error, setError] = useState<string | null>(null);
  const { setActiveOrganizationId } = useActiveOrganizationId();

  useEffect(() => {
    async function accept() {
      try {
        const { id } = await params;
        
        // 1. Get invitation details to show context (optional, but good UX)
        const { data: invitation, error: fetchError } = await authClient.organization.getInvitation({
            query: {
                id
            }
        });

        if (fetchError) {
            console.error("Failed to fetch invitation:", fetchError);
            setStatus("error");
            setError(fetchError.message || "Invalid invitation");
            return;
        }

        setStatus("accepting");

        // 2. Accept the invitation
        const { data: acceptedData, error: acceptError } = await authClient.organization.acceptInvitation({
          invitationId: id,
        });

        if (acceptError) {
          console.error("Failed to accept invitation:", acceptError);
          setStatus("error");
          setError(acceptError.message || "Failed to accept invitation");
          return;
        }

        // 3. Set as active organization
        if (acceptedData?.member?.organizationId) {
            setActiveOrganizationId(acceptedData.member.organizationId);
        }

        setStatus("success");
        
        // 4. Redirect to dashboard after a short delay
        setTimeout(() => {
            router.push("/organizer");
        }, 1500);

      } catch (err) {
        console.error("Unexpected error:", err);
        setStatus("error");
        setError("An unexpected error occurred");
      }
    }

    accept();
  }, [params, router, setActiveOrganizationId]);

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h1 className="mb-2 text-xl font-bold text-red-800">Invitation Error</h1>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => router.push("/")}
            className="mt-4 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center">
        <h1 className="mb-4 text-2xl font-bold">
          {status === "verifying" && "Verifying Invitation..."}
          {status === "accepting" && "Joining Organization..."}
          {status === "success" && "Successfully Joined!"}
        </h1>
        <p className="text-gray-600">
          {status === "success" 
            ? "Redirecting you to the dashboard..." 
            : "Please wait while we process your invitation."}
        </p>
      </div>
    </div>
  );
}
