"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Props = { eventId: string };

type UserRating = {
  id: string;
  eventId: string;
  userId: string;
  stars: number;
  comment: string | null;
  createdAt: Date;
} | null;

export default function RatingWidget({ eventId }: Props) {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summary, setSummary] = useState<{ average: number; count: number } | null>(null);
  const [userRating, setUserRating] = useState<UserRating>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    setSummaryLoading(true);
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
      console.log("Rating summary data:", data);
      setSummary(data.summary);
      setUserRating(data.userRating);
    } catch (e: any) {
      console.error("Error fetching rating summary:", e);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [eventId]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/ratings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ stars, comment }),
      });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        throw new Error("Unexpected response from server");
      }
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Đã có lỗi xảy ra");
      setComment("");
      setStars(0);
      setSummary(data.summary);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-md p-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Đánh giá sự kiện</div>
        {summaryLoading ? (
          <div className="text-sm text-muted-foreground">Đang tải...</div>
        ) : summary && summary.count > 0 ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "text-lg",
                    i < Math.round(summary.average) ? "text-yellow-500" : "text-gray-300"
                  )}
                >
                  ★
                </span>
              ))}
            </div>
            <div className="text-sm text-muted-foreground">
              {summary.average.toFixed(1)} ({summary.count} đánh giá)
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Chưa có đánh giá</div>
        )}
      </div>

      {userRating ? (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-green-800">Bạn đã đánh giá:</span>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "text-lg",
                    i < userRating.stars ? "text-yellow-500" : "text-gray-300"
                  )}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
          {userRating.comment && (
            <div className="text-sm text-green-700">
              "{userRating.comment}"
            </div>
          )}
          <div className="text-xs text-green-600 mt-1">
            Đánh giá vào: {new Date(userRating.createdAt).toLocaleDateString("vi-VN")}
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={cn(
                "text-2xl transition-colors",
                (hover || stars) >= n ? "text-yellow-500" : "text-gray-300"
              )}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setStars(n)}
              aria-label={`Rate ${n} stars`}
            >
              ★
            </button>
          ))}
        </div>
      )}

      {!userRating && (
        <>
          <div className="mt-3">
            <Textarea
              placeholder="Chia sẻ cảm nhận của bạn (tuỳ chọn)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          {error && <div className="mt-2 text-red-600 text-sm">{error}</div>}

          <div className="mt-3">
            <Button onClick={handleSubmit} disabled={loading || stars === 0}>
              {loading ? "Đang gửi..." : "Gửi đánh giá"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}


