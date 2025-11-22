"use client";

import { useMemo, useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "lucide-react";
import { PendingEvent } from "@/hooks/use-admin-data";

interface EventDetailModalProps {
  event: PendingEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (eventId: string) => void;
  onReject: (eventId: string) => void;
  isProcessing: boolean;
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
      start: new Date(event.start_date).toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        weekday: "long",
      }),
      end: new Date(event.end_date).toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        weekday: "long",
      }),
      created: new Date(event.created_at).toLocaleDateString("vi-VN", {
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
    return new Date(dateString).toLocaleString("vi-VN", {
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
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

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

        {/* Showings Dropdown */}
        {event.showings && event.showings.length > 0 && (
          <DetailCard icon={Film} title="Lịch chiếu (Showings)">
            <div className="space-y-4">
              <Select
                value={selectedShowingId}
                onValueChange={setSelectedShowingId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn lịch chiếu để xem chi tiết" />
                </SelectTrigger>
                <SelectContent>
                  {event.showings.map((showing) => (
                    <SelectItem key={showing.id} value={showing.id}>
                      {showing.name || "Lịch chiếu không tên"} -{" "}
                      {formatShowingDateTime(showing.startTime)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedShowing && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-semibold text-gray-700">
                        Tên lịch chiếu:
                      </span>
                      <p className="text-gray-600">
                        {selectedShowing.name || "Không có tên"}
                      </p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700">
                        Trạng thái:
                      </span>
                      <p className="text-gray-600">
                        {selectedShowing.isActive ? (
                          <span className="text-green-600">Đang hoạt động</span>
                        ) : (
                          <span className="text-red-600">Không hoạt động</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700">
                        Thời gian bắt đầu:
                      </span>
                      <p className="text-gray-600">
                        {formatShowingDateTime(selectedShowing.startTime)}
                      </p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700">
                        Thời gian kết thúc:
                      </span>
                      <p className="text-gray-600">
                        {formatShowingDateTime(selectedShowing.endTime)}
                      </p>
                    </div>
                    {selectedShowing.ticketSaleStart && (
                      <div>
                        <span className="font-semibold text-gray-700">
                          Bắt đầu bán vé:
                        </span>
                        <p className="text-gray-600">
                          {formatShowingDateTime(selectedShowing.ticketSaleStart)}
                        </p>
                      </div>
                    )}
                    {selectedShowing.ticketSaleEnd && (
                      <div>
                        <span className="font-semibold text-gray-700">
                          Kết thúc bán vé:
                        </span>
                        <p className="text-gray-600">
                          {formatShowingDateTime(selectedShowing.ticketSaleEnd)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="text-sm text-gray-500">
                Tổng số lịch chiếu: {event.showings.length}
              </div>
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
            {event.capacity || "To be determined"}
          </DetailCard>

          <DetailCard icon={Tag} title="Price">
            {event.price ? formatCurrency(event.price) : "To be determined"}
          </DetailCard>
        </div>

        {/* Created Date */}
        <DetailCard icon={Calendar} title="Submitted On">
          {formattedDates.created}
        </DetailCard>

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
        </div>
      </div>
    </Modal>
  );
}
