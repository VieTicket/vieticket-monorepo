"use client";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type Rating = {
  id: string;
  eventId: string;
  userId: string;
  stars: number;
  comment: string | null;
  createdAt: Date;
  userName: string | null;
  userImage: string | null;
};

type Props = { eventId: string };

export default function RatingList({ eventId }: Props) {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRatings = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/ratings`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        throw new Error("Unexpected response from server");
      }
      const data = await res.json();
      setRatings(data.recent || []);
    } catch (e: any) {
      console.error("Error fetching ratings:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatings();
  }, [eventId]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderStars = (stars: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={cn(
          "text-lg",
          i < stars ? "text-yellow-500" : "text-gray-300"
        )}
      >
        ★
      </span>
    ));
  };

  if (loading) {
    return (
      <div className="border rounded-md p-4">
        <div className="text-lg font-semibold mb-4">Đánh giá từ khách hàng</div>
        <div className="text-center py-8 text-muted-foreground">
          Đang tải đánh giá...
        </div>
      </div>
    );
  }

  if (ratings.length === 0) {
    return (
      <div className="border rounded-md p-4">
        <div className="text-lg font-semibold mb-4">Đánh giá từ khách hàng</div>
        <div className="text-center py-8 text-muted-foreground">
          Chưa có đánh giá nào cho sự kiện này.
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-md p-4">
      <div className="text-lg font-semibold mb-4">Đánh giá từ khách hàng</div>
      <div className="space-y-4">
        {ratings.map((rating) => (
          <div key={rating.id} className="border-b pb-4 last:border-b-0">
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={rating.userImage || ""} />
                <AvatarFallback>
                  {rating.userName?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {rating.userName || "Người dùng ẩn danh"}
                  </span>
                  <div className="flex items-center gap-1">
                    {renderStars(rating.stars)}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  {formatDate(rating.createdAt)}
                </div>
                {rating.comment && (
                  <div className="text-sm text-gray-700 leading-relaxed">
                    {rating.comment}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
