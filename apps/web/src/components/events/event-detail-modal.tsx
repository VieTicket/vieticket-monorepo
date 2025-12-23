"use client";

import { useMemo, useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar,
  MapPin,
  User,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Tag,
  FileText,
  Image as ImageIcon,
  Film,
  FileCheck,
  ExternalLink,
  Edit,
} from "lucide-react";
import { PendingEvent } from "@/hooks/use-admin-data";

interface EventDetailModalProps {
  event: PendingEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (eventId: string) => void;
  onReject: (eventId: string) => void;
  isProcessing: boolean;
  onEdit?: (eventId: string) => void;
}

// Memoized detail card component
const DetailCard = ({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
          <div className="text-gray-700">{children}</div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export function EventDetailModal({
  event,
  isOpen,
  onClose,
  onApprove,
  onReject,
  isProcessing,
  onEdit,
}: EventDetailModalProps) {
  const [selectedShowingId, setSelectedShowingId] = useState<string>("");

  // Reset selected showing when event changes
  useEffect(() => {
    setSelectedShowingId("");
  }, [event?.id]);

  // Memoize formatted dates to prevent recalculation
  const formattedDates = useMemo(() => {
    if (!event) return null;

    return {
      start: new Date(event.start_date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        weekday: "long",
      }),
      end: new Date(event.end_date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        weekday: "long",
      }),
      created: new Date(event.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        weekday: "long",
      }),
    };
  }, [event?.start_date, event?.end_date, event?.created_at]);

  // Get selected showing details
  const selectedShowing = useMemo(() => {
    if (!event?.showings || !selectedShowingId) return null;
    return event.showings.find((s) => s.id === selectedShowingId);
  }, [event?.showings, selectedShowingId]);

  // Format showing date/time
  const formatShowingDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "long",
    });
  };

  if (!event || !formattedDates) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Document type labels mapping
  const getDocumentTypeLabel = (documentType: string) => {
    const labels: Record<string, string> = {
      event_permit: "Giấy Phép Tổ Chức Sự Kiện",
      venue_contract: "Hợp Đồng Địa Điểm",
      insurance: "Giấy Chứng Nhận Bảo Hiểm",
      other: "Tài Liệu Khác",
    };
    return labels[documentType] || documentType;
  };

  // Check if event has documents or contract
  const hasDocuments = event.eventMetadata?.eventProofDocuments && event.eventMetadata.eventProofDocuments.length > 0;
  const hasContract = event.eventMetadata?.contractScreenshotUrl;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Event Details">
      <div className="space-y-6">
        {/* Event Image */}
        {event.image_url && (
          <div className="relative">
            <img
              src={event.image_url}
              alt={event.title}
              className="w-full h-64 object-cover rounded-lg"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
              <ImageIcon className="h-4 w-4 inline mr-1" />
              Event Image
            </div>
          </div>
        )}

        {/* Event Title and Category */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
          <div className="flex items-center gap-2 text-gray-600">
            <Tag className="h-4 w-4" />
            <span className="text-sm">{event.category || "General Event"}</span>
          </div>
        </div>

        {/* Description */}
        <DetailCard icon={FileText} title="Description">
          <div 
            className="leading-relaxed prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ 
              __html: event.description || "No description available for this event." 
            }}
          />
        </DetailCard>

        {/* Seat Map Image */}
        {event.seatMapImage ? (
          <DetailCard icon={ImageIcon} title="Seat Map">
            <div className="space-y-2">
              <img
                src={event.seatMapImage}
                alt="Seat Map"
                className="w-full rounded-lg border border-gray-200 shadow-sm max-h-96 object-contain"
                onError={(e) => {
                  console.error("Error loading seatmap image:", event.seatMapImage);
                  e.currentTarget.style.display = "none";
                }}
                onLoad={() => {
                  console.log("Seatmap image loaded successfully:", event.seatMapImage);
                }}
              />
            </div>
          </DetailCard>
        ) : (
          event.seatMapId && (
            <DetailCard icon={ImageIcon} title="Seat Map">
              <div className="text-sm text-gray-500">
                Seat map ID: {event.seatMapId} (Image not available)
              </div>
            </DetailCard>
          )
        )}

        {/* Showings Dropdown */}
        {event.showings && event.showings.length > 0 && (
          <DetailCard icon={Film} title={`Showings - ${event.showings.length} sessions`}>
            <div className="space-y-4">
              <div className="space-y-2">
                {event.showings.map((showing) => (
                  <div
                    key={showing.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedShowingId === showing.id
                        ? "bg-blue-50 border-blue-300 shadow-sm"
                        : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                    }`}
                    onClick={() => {
                      setSelectedShowingId(
                        selectedShowingId === showing.id ? "" : showing.id
                      );
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {showing.name || "Unnamed showing"}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {formatShowingDateTime(showing.startTime)}
                        </div>
                      </div>
                      <div className="ml-3 flex items-center gap-2">
                        {showing.isActive ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                            Inactive
                          </span>
                        )}
                        <Clock className={`h-4 w-4 text-gray-400 transition-transform ${
                          selectedShowingId === showing.id ? "rotate-90" : ""
                        }`} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedShowing && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                  <h4 className="font-semibold text-gray-900 text-base mb-3">
                    Showing Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-semibold text-gray-700">
                        Showing Name:
                      </span>
                      <p className="text-gray-600 mt-1">
                        {selectedShowing.name || "No name"}
                      </p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700">
                        Status:
                      </span>
                      <p className="text-gray-600 mt-1">
                        {selectedShowing.isActive ? (
                          <span className="text-green-600 font-medium">Active</span>
                        ) : (
                          <span className="text-red-600 font-medium">Inactive</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700">
                        Start Time:
                      </span>
                      <p className="text-gray-600 mt-1">
                        {formatShowingDateTime(selectedShowing.startTime)}
                      </p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700">
                        End Time:
                      </span>
                      <p className="text-gray-600 mt-1">
                        {formatShowingDateTime(selectedShowing.endTime)}
                      </p>
                    </div>
                    {selectedShowing.ticketSaleStart && (
                      <div>
                        <span className="font-semibold text-gray-700">
                          Ticket Sale Start:
                        </span>
                        <p className="text-gray-600 mt-1">
                          {formatShowingDateTime(selectedShowing.ticketSaleStart)}
                        </p>
                      </div>
                    )}
                    {selectedShowing.ticketSaleEnd && (
                      <div>
                        <span className="font-semibold text-gray-700">
                          Ticket Sale End:
                        </span>
                        <p className="text-gray-600 mt-1">
                          {formatShowingDateTime(selectedShowing.ticketSaleEnd)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </DetailCard>
        )}

        {/* Event Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DetailCard icon={MapPin} title="Location">
            {event.location || "Location to be determined"}
          </DetailCard>

          <DetailCard icon={User} title="Organizer">
            {event.organizer_name || "Unknown Organizer"}
          </DetailCard>

          <DetailCard icon={Calendar} title="Start Date">
            {formattedDates.start}
          </DetailCard>

          <DetailCard icon={Clock} title="End Date">
            {formattedDates.end}
          </DetailCard>

          <DetailCard icon={Eye} title="Capacity">
            {event.capacity > 0 ? `${event.capacity.toLocaleString("en-US")} seats` : "To be determined"}
          </DetailCard>

          <DetailCard icon={Tag} title="Price">
            {event.priceRange ? (
              <div>
                {formatCurrency(event.priceRange.min)}
                {event.priceRange.min !== event.priceRange.max && (
                  <span className="text-gray-500"> - {formatCurrency(event.priceRange.max)}</span>
                )}
              </div>
            ) : event.price > 0 ? (
              formatCurrency(event.price)
            ) : (
              "To be determined"
            )}
          </DetailCard>
        </div>

        {/* Created Date */}
        <DetailCard icon={Calendar} title="Submitted On">
          {formattedDates.created}
        </DetailCard>

        {/* Event Documents and Contract */}
        {(hasDocuments || hasContract) && (
          <DetailCard icon={FileCheck} title="Giấy Tờ và Hợp Đồng">
            <div className="space-y-6">
              {/* Proof Documents */}
              {hasDocuments && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 text-sm mb-3">
                    Tài Liệu Chứng Minh
                  </h4>
                  {event.eventMetadata?.eventProofDocuments?.map((doc, docIndex) => (
                    <div key={docIndex} className="border border-gray-200 rounded-lg p-4 space-y-3">
                      <div className="font-medium text-gray-900">
                        {getDocumentTypeLabel(doc.documentType)}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {doc.documentUrl.map((url, urlIndex) => (
                          <div key={urlIndex} className="relative group">
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <div className="relative aspect-video bg-white rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 transition-colors">
                                <img
                                  src={url}
                                  alt={`${getDocumentTypeLabel(doc.documentType)} ${urlIndex + 1}`}
                                  className="w-full h-full object-contain"
                                  style={{ display: "block" }}
                                  onError={(e) => {
                                    const target = e.currentTarget;
                                    target.style.display = "none";
                                    const parent = target.parentElement;
                                    if (parent) {
                                      parent.innerHTML = `
                                        <div class="flex items-center justify-center h-full text-gray-500 bg-gray-100">
                                          <FileText class="h-8 w-8" />
                                        </div>
                                      `;
                                    }
                                  }}
                                />
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                  <div className="bg-black/70 backdrop-blur-sm rounded-full p-1.5">
                                    <ExternalLink className="h-4 w-4 text-white" />
                                  </div>
                                </div>
                              </div>
                            </a>
                            <p className="text-xs text-gray-500 mt-1 text-center truncate">
                              Tài liệu {urlIndex + 1}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Contract Screenshot */}
              {hasContract && (
                <div className="space-y-3 border-t pt-4">
                  <h4 className="font-semibold text-gray-900 text-sm">
                    Hợp Đồng Đã Ký
                  </h4>
                  <div className="relative group">
                    <a
                      href={event.eventMetadata?.contractScreenshotUrl || ""}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <div className="relative bg-white rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 transition-colors">
                        <img
                          src={event.eventMetadata?.contractScreenshotUrl || ""}
                          alt="Hợp Đồng Đã Ký"
                          className="w-full max-h-96 object-contain"
                          style={{ display: "block" }}
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = "none";
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `
                                <div class="flex items-center justify-center h-64 text-gray-500 bg-gray-100">
                                  <FileText class="h-12 w-12" />
                                </div>
                              `;
                            }
                          }}
                        />
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <div className="bg-black/70 backdrop-blur-sm rounded-full p-1.5">
                            <ExternalLink className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      </div>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </DetailCard>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4 border-t">
          <Button
            onClick={() => onApprove(event.id)}
            disabled={isProcessing || event.approvalStatus === "approved"}
            className="flex-1 bg-green-600 hover:bg-green-700"
            size="lg"
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            {event.approvalStatus === "approved"
              ? "Already Approved"
              : "Approve Event"}
          </Button>
          <Button
            onClick={() => onReject(event.id)}
            disabled={isProcessing || event.approvalStatus === "rejected"}
            variant="destructive"
            className="flex-1"
            size="lg"
          >
            <XCircle className="h-5 w-5 mr-2" />
            {event.approvalStatus === "rejected"
              ? "Already Rejected"
              : "Reject Event"}
          </Button>
          {event.approvalStatus === "approved" && onEdit && (
            <Button
              onClick={() => onEdit(event.id)}
              variant="outline"
              size="lg"
              className="flex-shrink-0"
            >
              <Edit className="h-5 w-5 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
