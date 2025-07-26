"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  UserCheck,
  UserX,
  Loader2,
  Eye,
  Building,
  Calendar,
  Globe,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import {
  getPendingOrganizersAction,
  approveOrganizerAction,
  rejectOrganizerAction,
} from "@/lib/actions/admin/organizer-actions";

interface PendingOrganizer {
  id: string;
  name: string;
  foundedDate: string | null;
  website: string | null;
  isActive: boolean;
  address: string | null;
  organizerType: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    image: string | null;
    createdAt: string;
    banned: boolean | null;
    banReason: string | null;
  };
}

export default function OrganizerPendingPage() {
  const [organizers, setOrganizers] = useState<PendingOrganizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [selectedOrganizer, setSelectedOrganizer] =
    useState<PendingOrganizer | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    fetchPendingOrganizers();
  }, []);

  const fetchPendingOrganizers = async () => {
    try {
      setLoading(true);
      const result = await getPendingOrganizersAction();

      if (result.success) {
        setOrganizers(result.data);
      } else {
        toast.error(result.error || "Failed to fetch pending organizers");
      }
    } catch (error) {
      console.error("Error fetching pending organizers:", error);
      toast.error(
        "An unexpected error occurred while fetching pending organizers"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (organizer: PendingOrganizer) => {
    setProcessingIds((prev) => new Set(prev).add(organizer.id));

    try {
      const result = await approveOrganizerAction(organizer.user.id);

      if (result.success) {
        toast.success(`${organizer.user.name} has been approved successfully!`);
        fetchPendingOrganizers(); // Refresh the list
      } else {
        toast.error(result.error || "Failed to approve organizer");
      }
    } catch (error) {
      console.error("Error approving organizer:", error);
      toast.error("An unexpected error occurred while approving organizer");
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(organizer.id);
        return newSet;
      });
    }
  };

  const handleReject = async () => {
    if (!selectedOrganizer || !rejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setProcessingIds((prev) => new Set(prev).add(selectedOrganizer.id));

    try {
      const result = await rejectOrganizerAction(
        selectedOrganizer.user.id,
        rejectReason.trim()
      );

      if (result.success) {
        toast.success(`${selectedOrganizer.user.name} has been rejected.`);
        setRejectDialogOpen(false);
        setSelectedOrganizer(null);
        setRejectReason("");
        fetchPendingOrganizers(); // Refresh the list
      } else {
        toast.error(result.error || "Failed to reject organizer");
      }
    } catch (error) {
      console.error("Error rejecting organizer:", error);
      toast.error("An unexpected error occurred while rejecting organizer");
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(selectedOrganizer.id);
        return newSet;
      });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not provided";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleViewDetails = (organizer: PendingOrganizer) => {
    setSelectedOrganizer(organizer);
    setDetailsDialogOpen(true);
  };

  const handleRejectClick = (organizer: PendingOrganizer) => {
    setSelectedOrganizer(organizer);
    setRejectDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Organizer Pending Active
          </h1>
          <p className="text-muted-foreground">
            Review and approve pending organizer applications.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Pending Organizer Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading pending organizers...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Organizer Pending Active
        </h1>
        <p className="text-muted-foreground">
          Review and approve pending organizer applications.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Pending Organizer Applications ({organizers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {organizers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No pending organizer applications.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organizer Name</TableHead>
                    <TableHead>User Details</TableHead>
                    <TableHead>Business Info</TableHead>
                    <TableHead>Applied Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizers.map((organizer) => (
                    <TableRow key={organizer.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {organizer.user.image && (
                            <img
                              src={organizer.user.image}
                              alt={organizer.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          )}
                          <div>
                            <div className="font-medium">{organizer.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {organizer.organizerType || "Type not specified"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">
                            {organizer.user.name}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {organizer.user.email}
                          </div>
                          {organizer.user.phone && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {organizer.user.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {organizer.website && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Globe className="h-3 w-3" />
                              <a
                                href={organizer.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                              >
                                Website
                              </a>
                            </div>
                          )}
                          {organizer.address && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {organizer.address}
                            </div>
                          )}
                          {organizer.foundedDate && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              Founded: {formatDate(organizer.foundedDate)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDate(organizer.user.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(organizer)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleApprove(organizer)}
                            disabled={processingIds.has(organizer.id)}
                          >
                            {processingIds.has(organizer.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4 mr-1" />
                                Approve
                              </>
                            )}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRejectClick(organizer)}
                            disabled={processingIds.has(organizer.id)}
                          >
                            <UserX className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Organizer Application Details</DialogTitle>
            <DialogDescription>
              Review the complete application for {selectedOrganizer?.user.name}
            </DialogDescription>
          </DialogHeader>
          {selectedOrganizer && (
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">
                    Personal Information
                  </Label>
                  <div className="mt-2 space-y-2">
                    <div>
                      <strong>Name:</strong> {selectedOrganizer.user.name}
                    </div>
                    <div>
                      <strong>Email:</strong> {selectedOrganizer.user.email}
                    </div>
                    {selectedOrganizer.user.phone && (
                      <div>
                        <strong>Phone:</strong> {selectedOrganizer.user.phone}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">
                    Organization Details
                  </Label>
                  <div className="mt-2 space-y-2">
                    <div>
                      <strong>Organization Name:</strong>{" "}
                      {selectedOrganizer.name}
                    </div>
                    <div>
                      <strong>Type:</strong>{" "}
                      {selectedOrganizer.organizerType || "Not specified"}
                    </div>
                    {selectedOrganizer.foundedDate && (
                      <div>
                        <strong>Founded:</strong>{" "}
                        {formatDate(selectedOrganizer.foundedDate)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {selectedOrganizer.website && (
                <div>
                  <Label className="text-sm font-medium">Website</Label>
                  <div className="mt-1">
                    <a
                      href={selectedOrganizer.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {selectedOrganizer.website}
                    </a>
                  </div>
                </div>
              )}
              {selectedOrganizer.address && (
                <div>
                  <Label className="text-sm font-medium">Address</Label>
                  <div className="mt-1">{selectedOrganizer.address}</div>
                </div>
              )}
              <div>
                <Label className="text-sm font-medium">Application Date</Label>
                <div className="mt-1">
                  {formatDate(selectedOrganizer.user.createdAt)}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDetailsDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Organizer Application</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting {selectedOrganizer?.user.name}'s
              application. They will see this message when they log in.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rejectReason">Rejection Reason</Label>
              <Textarea
                id="rejectReason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Please provide a clear reason for rejecting this application..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setSelectedOrganizer(null);
                setRejectReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={
                !rejectReason.trim() ||
                processingIds.has(selectedOrganizer?.id || "")
              }
            >
              {processingIds.has(selectedOrganizer?.id || "") ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UserX className="h-4 w-4 mr-1" />
                  Reject Application
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
