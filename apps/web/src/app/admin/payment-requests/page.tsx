"use client"

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  updatePayoutStatusAction,
  uploadPayoutProofAction,
  getAdminPayoutRequestsAction
} from "@/lib/actions/organizer/payout-request-actions";
import { PayoutRequestWithEvent } from "@vieticket/db/pg/models/payout-requests";
import { PayoutStatus } from "@vieticket/db/pg/schema";
import { FileUploader } from "@/components/ui/file-uploader";

const PAGE_SIZE = 10;
const STATUS_OPTIONS: PayoutStatus[] = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "in_discussion",
  "completed"
];

export default function AdminPaymentRequestsPage() {
  const [requests, setRequests] = useState<PayoutRequestWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusEdits, setStatusEdits] = useState<Record<string, PayoutStatus>>({});
  const [agreedAmountEdits, setAgreedAmountEdits] = useState<Record<string, number>>({});
  const [statusFilter, setStatusFilter] = useState<PayoutStatus | "all">("all");

  const fetchPayoutRequests = async (pageNum = page, status: PayoutStatus | "all" = statusFilter) => {
    setLoading(true);
    try {
      const response = await getAdminPayoutRequestsAction(pageNum, PAGE_SIZE, status !== "all" ? status : undefined);
      if (response.success && response.data) {
        setRequests(response.data.data || []);
        setTotalPages(response.data.totalPages || 1);
      } else {
        setRequests([]);
        toast.error("Error", { description: response.message || "Failed to fetch payout requests" });
      }
    } catch (error) {
      setRequests([]);
      toast.error("Error", { description: "An unexpected error occurred" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayoutRequests(page, statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  const handleStatusEdit = (requestId: string, status: string) => {
    setStatusEdits((prev) => ({ ...prev, [requestId]: status as PayoutStatus }));
  };

  const handleAgreedAmountSave = async (requestId: string) => {
    const newAmount = agreedAmountEdits[requestId];
    if (newAmount === undefined || newAmount === null) return;
    if (!window.confirm("Are you sure you want to update the agreed amount?")) return;

    try {
      const result = await updatePayoutStatusAction(requestId, requests.find(r => r.id === requestId)?.status!, newAmount);
      if (result) {
        toast.success("Success", { description: "Agreed amount updated successfully" });
        setRequests((prev) =>
          prev.map((req) =>
            req.id === requestId
              ? { ...req, agreedAmount: newAmount }
              : req
          )
        );
        setAgreedAmountEdits((prev) => {
          const copy = { ...prev };
          delete copy[requestId];
          return copy;
        });
      } else {
        toast.error("Error", { description: "Failed to update agreed amount" });
      }
    } catch (error: any) {
      toast.error("Error", { description: error.message || "An unexpected error occurred" });
    }
  };

  const handleAgreedAmountEdit = (requestId: string, value: string) => {
    setAgreedAmountEdits((prev) => ({
      ...prev,
      [requestId]: Number(value)
    }));
  };

  const handleStatusSave = async (requestId: string) => {
    const newStatus = statusEdits[requestId];
    if (!newStatus) return;
    if (!window.confirm("Are you sure you want to update the status?")) return;

    // Only allow agreedAmount to be set when status is "approved"
    const updateData: {
      status: PayoutStatus;
      agreedAmount?: number;
    } = { status: newStatus };

    if (newStatus === "approved" && agreedAmountEdits[requestId] !== undefined) {
      updateData.agreedAmount = agreedAmountEdits[requestId];
    }

    try {
      const result = await updatePayoutStatusAction(requestId, updateData.status, updateData.agreedAmount);
      if (result) {
        toast.success("Success", { description: "Status updated successfully" });
        setRequests((prev) =>
          prev.map((req) =>
            req.id === requestId
              ? {
                ...req,
                status: newStatus,
                agreedAmount: updateData.agreedAmount ?? req.agreedAmount,
                completionDate:
                  newStatus === "approved" || newStatus === "rejected"
                    ? new Date()
                    : req.completionDate,
              }
              : req
          )
        );
        setStatusEdits((prev) => {
          const copy = { ...prev };
          delete copy[requestId];
          return copy;
        });
        setAgreedAmountEdits((prev) => {
          const copy = { ...prev };
          delete copy[requestId];
          return copy;
        });
      } else {
        toast.error("Error", { description: "Failed to update status" });
      }
    } catch (error: any) {
      toast.error("Error", { description: error.message || "An unexpected error occurred" });
    }
  };

  // Upload payment evidence logic (similar to avatar upload in AccountForm)
  const handleProofUploadSuccess = async (requestId: string, response: { secure_url: string }) => {
    const proofUrl = response.secure_url;
    try {
      const result = await uploadPayoutProofAction(requestId, proofUrl);
      if (result) {
        toast.success("Proof uploaded successfully");
        setRequests((prev) =>
          prev.map((req) =>
            req.id === requestId ? { ...req, proofDocumentUrl: proofUrl } : req
          )
        );
      } else {
        toast.error("Failed to upload proof");
      }
    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred");
    }
  };

  if (loading) {
    return <div className="container mx-auto py-8 px-4">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Admin Payout Management</h1>
      <div className="mb-4 flex items-center gap-2">
        <label htmlFor="statusFilter" className="font-medium">Filter by status:</label>
        <select
          id="statusFilter"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as PayoutStatus | "all")}
          className="border p-1"
        >
          <option value="all">All</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
          ))}
        </select>
      </div>
      {requests.length === 0 ? (
        <p>No payout requests found.</p>
      ) : (
        <>
          <table className="min-w-full border">
            <thead>
              <tr className="border-b">
                <th className="p-2">Event</th>
                <th className="p-2">Requested Amount</th>
                <th className="p-2">Agreed Amount</th>
                <th className="p-2">Status</th>
                <th className="p-2">Request Date</th>
                <th className="p-2">Completion Date</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id} className="border-b">
                  <td className="p-2">{request.event?.name || "N/A"}</td>
                  <td className="p-2">{request.requestedAmount.toLocaleString("vi-VN")} VND</td>
                  <td className="p-2">
                    <input
                      type="number"
                      min={0}
                      value={agreedAmountEdits[request.id] ?? request.agreedAmount ?? ""}
                      onChange={e => handleAgreedAmountEdit(request.id, e.target.value)}
                      className="border p-1 w-24"
                      placeholder="Agreed amount"
                    />
                    {agreedAmountEdits[request.id] !== undefined &&
                      agreedAmountEdits[request.id] !== request.agreedAmount && (
                        <button
                          className="ml-2 px-2 py-1 bg-green-500 text-white rounded"
                          onClick={() => handleAgreedAmountSave(request.id)}
                        >
                          Save
                        </button>
                      )
                    }
                  </td>
                  <td className="p-2">
                    <select
                      value={statusEdits[request.id] ?? request.status}
                      onChange={(e) => handleStatusEdit(request.id, e.target.value)}
                      className="border p-1"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
                      ))}
                    </select>
                    {statusEdits[request.id] && statusEdits[request.id] !== request.status && (
                      <button
                        className="ml-2 px-2 py-1 bg-blue-500 text-white rounded"
                        onClick={() => handleStatusSave(request.id)}
                      >
                        Save
                      </button>
                    )}
                  </td>
                  <td className="p-2">{new Date(request.requestDate).toLocaleDateString("vi-VN")}</td>
                  <td className="p-2">{request.completionDate ? new Date(request.completionDate).toLocaleDateString("vi-VN") : "N/A"}</td>
                  <td className="p-2 space-y-2">
                    {/* Show preview if already uploaded */}
                    {request.proofDocumentUrl && (
                      <a
                        href={request.proofDocumentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block mb-2 text-blue-600 underline"
                      >
                        View Evidence
                      </a>
                    )}
                    <FileUploader
                      folder="payout-evidence"
                      buttonLabel="Upload Evidence"
                      mode="button"
                      onUploadSuccess={(response) => handleProofUploadSuccess(request.id, response)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-center items-center mt-4 space-x-2">
            <button
              className="px-3 py-1 border rounded"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              className="px-3 py-1 border rounded"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
