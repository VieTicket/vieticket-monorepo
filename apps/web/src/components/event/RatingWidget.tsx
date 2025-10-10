"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Props = { eventId: string };

export default function RatingWidget({ eventId }: Props) {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<{ average: number; count: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
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
      setSummary(data.summary);
    } catch (e: any) {
      // ignore
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
        {summary && (
          <div className="text-sm text-muted-foreground">
            Trung bình: {summary.average.toFixed(1)} ⭐ ({summary.count})
          </div>
        )}
      </div>

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
    </div>
  );
}


