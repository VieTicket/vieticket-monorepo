"use client"; // Why

import React, { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Ticket,
  MapPin,
  Building2,
  Globe,
  Landmark,
  ChevronDown,
  Clock,
  Star,
} from "lucide-react";
import { formatCurrencyVND, formatDateVi } from "@/lib/utils";
import { BuyTicketButton } from "../checkout/buy-ticket-button";

// RatingList component integrated for preview
const RatingList = ({
  eventId,
  isPreview,
}: {
  eventId?: string;
  isPreview?: boolean;
}) => {
  const [ratings, setRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(!isPreview);

  const fetchRatings = async () => {
    if (isPreview) return;
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
    if (!isPreview && eventId) {
      fetchRatings();
    }
  }, [eventId, isPreview]);

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
        className={`text-lg transition-colors ${
          i < stars ? "text-yellow-400" : "text-slate-600"
        }`}
      >
        ★
      </span>
    ));
  };

  // Mock data for preview mode
  const mockRatings = [
    {
      id: "1",
      userName: "Nguyễn Văn A",
      userImage:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face",
      stars: 5,
      comment:
        "Sự kiện rất tuyệt vời! Tổ chức chuyên nghiệp, âm thanh ánh sáng đỉnh cao. Chắc chắn sẽ tham gia những sự kiện tiếp theo.",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      id: "2",
      userName: "Trần Thị B",
      userImage:
        "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face",
      stars: 4,
      comment:
        "Sự kiện hay, không gian đẹp. Tuy nhiên mong đợi có thêm nhiều hoạt động tương tác hơn nữa.",
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      id: "3",
      userName: "Lê Minh C",
      userImage:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face",
      stars: 5,
      comment:
        "Xuất sắc! Đội ngũ tổ chức rất chu đáo, địa điểm thuận tiện. Đáng đồng tiền bát gạo.",
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  ];

  const displayRatings = isPreview ? mockRatings : ratings;

  if (loading) {
    return (
      <div className="professional-card rounded-lg p-4 sm:p-6 shadow-xl border border-slate-700/30 mt-4">
        <div className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-violet-400" />
          Đánh giá từ khách hàng
        </div>
        <div className="text-center py-8 text-slate-400">
          Đang tải đánh giá...
        </div>
      </div>
    );
  }

  if (displayRatings.length === 0) {
    return (
      <div className="professional-card rounded-lg p-4 sm:p-6 shadow-xl border border-slate-700/30 mt-4">
        <div className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-violet-400" />
          Đánh giá từ khách hàng
        </div>
        <div className="text-center py-8 text-slate-400">
          Chưa có đánh giá nào cho sự kiện này.
        </div>
      </div>
    );
  }

  return (
    <div className="professional-card rounded-lg p-4 sm:p-6 shadow-xl border border-slate-700/30 hover:border-violet-400/30 transition-all duration-300 mt-4">
      <div className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Star className="w-5 h-5 text-violet-400" />
        Đánh giá từ khách hàng ({displayRatings.length})
      </div>
      <div className="space-y-4">
        {displayRatings.map((rating) => (
          <div
            key={rating.id}
            className="border-b border-slate-700/30 pb-4 last:border-b-0"
          >
            <div className="flex items-start gap-3">
              <img
                src={
                  rating.userImage || "https://via.placeholder.com/40x40?text=U"
                }
                alt={rating.userName || "User"}
                className="w-10 h-10 rounded-full object-cover border border-slate-600"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-white">
                    {rating.userName || "Người dùng ẩn danh"}
                  </span>
                  <div className="flex items-center gap-1">
                    {renderStars(rating.stars)}
                  </div>
                </div>
                <div className="text-xs text-slate-400 mb-2">
                  {formatDate(rating.createdAt)}
                </div>
                {rating.comment && (
                  <div className="text-sm text-slate-300 leading-relaxed">
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
};

// RatingWidget component integrated for preview
const RatingWidget = ({
  eventId,
  isPreview,
}: {
  eventId?: string;
  isPreview?: boolean;
}) => {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(!isPreview);
  const [summary, setSummary] = useState<{
    average: number;
    count: number;
  } | null>(isPreview ? { average: 4.5, count: 47 } : null);
  const [userRating, setUserRating] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    if (isPreview) return;
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
      setSummary(data.summary);
      setUserRating(data.userRating);
    } catch (e: any) {
      console.error("Error fetching rating summary:", e);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    if (!isPreview && eventId) {
      fetchSummary();
    }
  }, [eventId, isPreview]);

  const handleSubmit = async () => {
    if (isPreview) {
      console.log("Preview mode: Rating submitted", { stars, comment });
      setStars(0);
      setComment("");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/ratings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ stars, comment }),
      });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        throw new Error("Unexpected response from server");
      }
      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data.error || "Đã có lỗi xảy ra");
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
    <div className="professional-card rounded-lg p-4 sm:p-6 shadow-xl border border-slate-700/30 hover:border-violet-400/30 transition-all duration-300 transform hover:translateY-[-2px] hover:shadow-2xl">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold text-white flex items-center gap-2">
          <Star className="w-5 h-5 text-violet-400" />
          Đánh giá sự kiện
        </div>
        {summaryLoading ? (
          <div className="text-sm text-slate-400">Đang tải...</div>
        ) : summary && summary.count > 0 ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }, (_, i) => (
                <span
                  key={i}
                  className={`text-lg transition-colors ${
                    i < Math.round(summary.average)
                      ? "text-yellow-400"
                      : "text-slate-600"
                  }`}
                >
                  ★
                </span>
              ))}
            </div>
            <div className="text-sm text-slate-400">
              {summary.average.toFixed(1)} ({summary.count} đánh giá)
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-400">Chưa có đánh giá</div>
        )}
      </div>

      {userRating ? (
        <div className="mt-3 p-3 professional-card border border-green-500/30 rounded-md">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-green-400">
              Bạn đã đánh giá:
            </span>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }, (_, i) => (
                <span
                  key={i}
                  className={`text-lg ${
                    i < userRating.stars ? "text-yellow-400" : "text-slate-600"
                  }`}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
          {userRating.comment && (
            <div className="text-sm text-green-300">"{userRating.comment}"</div>
          )}
          <div className="text-xs text-green-400 mt-1">
            Đánh giá vào:{" "}
            {new Date(userRating.createdAt).toLocaleDateString("vi-VN")}
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={`text-2xl transition-all duration-200 transform hover:scale-110 ${
                (hover || stars) >= n ? "text-yellow-400" : "text-slate-600"
              }`}
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
            <textarea
              placeholder="Chia sẻ cảm nhận của bạn (tuỳ chọn)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 hover:border-violet-400/50 focus:border-violet-400 rounded-lg text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400/20 transition-all duration-300 backdrop-blur-sm"
            />
          </div>

          {error && <div className="mt-2 text-red-400 text-sm">{error}</div>}

          <div className="mt-3">
            <button
              onClick={handleSubmit}
              disabled={loading || stars === 0}
              className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 border border-violet-400/30 hover:border-violet-400/50 rounded-lg px-6 py-2 text-white font-medium transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/20 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:scale-100"
            >
              {loading ? "Đang gửi..." : "Gửi đánh giá"}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export type EventPreviewData = {
  bannerUrl: string;
  name: string;
  slug: string;
  type: string;
  location: string;
  description: string;
  ticketSaleStart: string;
  ticketSaleEnd: string;
  posterUrl?: string;
  seatMapId?: string | null;
  organizer: {
    id: string;
    name: string;
    avatar?: string | null;
    website?: string | null;
    address?: string | null;
    organizerType?: string | null;
    rating?: {
      average: number;
      count: number;
    };
  } | null;
  areas: {
    id: string;
    name: string;
    price: number;
  }[];
  showings: {
    id?: string;
    name: string;
    startTime: string;
    endTime: string;
  }[];
  isPreview?: boolean;
  eventId?: string;
};

type Props = {
  data: EventPreviewData;
};

// Inline RatingStars component to avoid external styling conflicts
const InlineRatingStars = ({
  rating,
  size = "sm",
  showNumber = false,
}: {
  rating: number;
  size?: "sm" | "md" | "lg";
  showNumber?: boolean;
}) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {/* Full stars */}
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star
            key={`full-${i}`}
            className={`${sizeClasses[size]} text-yellow-400 fill-yellow-400 transition-transform duration-300 hover:scale-110`}
          />
        ))}
        {/* Half star */}
        {hasHalfStar && (
          <div className="relative">
            <Star
              className={`${sizeClasses[size]} text-slate-600 fill-slate-600`}
            />
            <Star
              className={`${sizeClasses[size]} text-yellow-400 fill-yellow-400 absolute top-0 left-0 transition-transform duration-300 hover:scale-110`}
              style={{ clipPath: "inset(0 50% 0 0)" }}
            />
          </div>
        )}
        {/* Empty stars */}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Star
            key={`empty-${i}`}
            className={`${sizeClasses[size]} text-slate-600 fill-slate-600 transition-transform duration-300 hover:scale-110`}
          />
        ))}
      </div>
      {showNumber && (
        <span className="text-sm text-slate-300 ml-1 font-medium">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
};

export function PreviewEvent({ data }: Props) {
  const t = useTranslations("event.details");
  const [selectedShowing, setSelectedShowing] = useState(0);
  const [showingDropdownOpen, setShowingDropdownOpen] = useState(false);
  const glowRef = useRef<HTMLDivElement>(null);

  const currentShowing = data.showings[selectedShowing] || data.showings[0];

  // Mouse tracking for glow effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (glowRef.current) {
        glowRef.current.style.left = `${e.clientX}px`;
        glowRef.current.style.top = `${e.clientY}px`;
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Calculate event start and end dates from all showings
  const eventStartDate =
    data.showings.length > 0
      ? new Date(
          Math.min(...data.showings.map((s) => new Date(s.startTime).getTime()))
        )
      : null;
  const eventEndDate =
    data.showings.length > 0
      ? new Date(
          Math.max(...data.showings.map((s) => new Date(s.endTime).getTime()))
        )
      : null;

  return (
    <>
      {/* Professional Dark Background */}
      <div className="fixed inset-0 bg-slate-950" style={{ zIndex: 0 }} />

      {/* Static Gradient Accents */}
      <div
        className="fixed top-0 right-0 w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none"
        style={{ zIndex: 1 }}
      />
      <div
        className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none"
        style={{ zIndex: 1 }}
      />

      {/* Interactive Mouse Glow */}
      <div
        ref={glowRef}
        className="fixed w-[400px] h-[400px] rounded-full pointer-events-none mix-blend-mode-screen transition-opacity duration-300"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.3) 0%, rgba(139,92,246,0) 70%)",
          filter: "blur(20px)",
          transform: "translate(-50%, -50%)",
          zIndex: 2,
        }}
      />

      {/* Clean CSS Styles */}
      <style jsx>{`
        .professional-card {
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.1);
          transition: all 0.3s ease;
        }

        .professional-card:hover {
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(139, 92, 246, 0.3);
          box-shadow:
            0 10px 25px -3px rgba(0, 0, 0, 0.3),
            0 0 20px rgba(139, 92, 246, 0.1);
          transform: translateY(-2px);
        }

        .glow-text {
          text-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
        }

        .professional-button {
          background: linear-gradient(
            135deg,
            rgba(139, 92, 246, 0.1),
            rgba(79, 70, 229, 0.1)
          );
          border: 1px solid rgba(139, 92, 246, 0.3);
          transition: all 0.3s ease;
        }

        .professional-button:hover {
          background: linear-gradient(
            135deg,
            rgba(139, 92, 246, 0.2),
            rgba(79, 70, 229, 0.2)
          );
          border: 1px solid rgba(139, 92, 246, 0.5);
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
          transform: scale(1.02);
        }
      `}</style>

      <div className="relative z-10">
        <header className="relative flex flex-col lg:flex-row professional-card rounded-lg sm:rounded-xl overflow-hidden shadow-xl">
          <div className="w-full lg:w-[30%] p-2 sm:p-3 lg:p-6 flex flex-col justify-between z-20 professional-card rounded-lg sm:rounded-xl border lg:border-r-0 order-2 lg:order-1 relative group  ">
            {/* Clean ticket tear lines */}
            <div className="absolute -right-5 -top-5 w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-slate-600/50 z-50 hidden lg:block bg-slate-900" />
            <div className="absolute -right-5 -bottom-5 w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-slate-600/50 z-50 hidden lg:block bg-slate-900" />

            <div className="space-y-2 sm:space-y-3 lg:space-y-4 ">
              <div>
                <h1 className="text-base sm:text-lg lg:text-2xl font-bold text-white line-clamp-2 leading-tight transform transition-all duration-300 ease-out group-hover:text-violet-400 group-hover:scale-105 glow-text ">
                  {data.name}
                </h1>
                <p className="text-xs text-slate-400">{data.type}</p>
              </div>

              <div className="space-y-1 text-xs sm:text-sm text-slate-300">
                <div>
                  <strong className="text-violet-400">{t("startDate")}</strong>{" "}
                  {eventStartDate
                    ? formatDateVi(eventStartDate)
                    : t("noShowing")}
                </div>
                <div>
                  <strong className="text-violet-400">{t("endDate")}</strong>{" "}
                  {eventEndDate ? formatDateVi(eventEndDate) : t("noShowing")}
                </div>
              </div>
            </div>

            <div className="mt-2 sm:mt-3 lg:mt-6 pt-2 sm:pt-3 border-t border-slate-700 space-y-2 sm:space-y-3">
              <p className="text-sm sm:text-base lg:text-xl font-semibold text-white transform transition-all duration-500 ease-out group-hover:scale-110">
                {t("from")}{" "}
                <span className="text-violet-400 glow-text inline-block transform transition-all duration-300 ease-out hover:scale-125">
                  {data.areas?.length > 0
                    ? formatCurrencyVND(
                        data.areas.reduce(
                          (min, area) => (area.price < min ? area.price : min),
                          data.areas[0].price
                        )
                      )
                    : "XX.XXX.XXX ₫"}
                </span>
              </p>

              <div className="space-y-1.5 sm:space-y-2">
                <BuyTicketButton
                  eventSlug={data.slug}
                  eventId={data.eventId}
                  isPreview={data.isPreview}
                />
                {/* Professional compare button */}
                {!data.isPreview && (
                  <button
                    className="w-full px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-slate-700 to-slate-800 border border-slate-600/50 hover:border-violet-400/50 hover:from-violet-500/20 hover:to-indigo-600/20 rounded-lg flex items-center justify-center gap-2 group transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/10"
                    onClick={() => {
                      console.log("So sánh sự kiện:", data.eventId);
                    }}
                  >
                    <Star className="w-4 h-4 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
                    So sánh sự kiện
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right: Professional image section */}
          <div className="w-full lg:w-[70%] aspect-[16/9] sm:aspect-[16/8] lg:aspect-[16/9] order-1 lg:order-2 lg:border-l-0 lg:border lg:border-slate-700/50 rounded-lg lg:rounded-l-none overflow-hidden group relative z-10 professional-card ">
            {data.bannerUrl ? (
              <div className="relative w-full h-full">
                <img
                  src={data.bannerUrl}
                  alt="Banner"
                  className="w-full h-full object-cover rounded-t-lg sm:rounded-t-xl lg:rounded-l-none lg:rounded-r-xl transform transition-transform duration-500 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-slate-900/20 group-hover:bg-slate-900/10 transition-all duration-300"></div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 rounded-t-lg sm:rounded-t-xl lg:rounded-l-none lg:rounded-r-xl professional-card">
                <span className="text-sm sm:text-base text-white">
                  No image
                </span>
              </div>
            )}
          </div>
        </header>

        <section className="professional-card rounded-lg p-4 shadow-xl mt-3 sm:mt-4 lg:mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs sm:text-sm text-slate-300">
            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400 transition-transform duration-300 hover:scale-110" />
              <span>{t("ticketSale")}:</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="break-all text-slate-300">
                {new Date(data.ticketSaleStart).toLocaleString("vi-VN", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span className="text-violet-400 hidden sm:inline">~</span>
              <span className="text-violet-400 sm:hidden">đến</span>
              <span className="break-all text-slate-300">
                {new Date(data.ticketSaleEnd).toLocaleString("vi-VN", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>

          {/* Showings Dropdown */}
          {data.showings.length > 1 && (
            <div className="relative mt-4">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300 mb-2">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400 transition-transform duration-300 hover:scale-110" />
                <span>{t("showings")}:</span>
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowingDropdownOpen(!showingDropdownOpen)}
                  className="w-full px-3 py-2 rounded-md text-xs sm:text-sm text-white min-h-[40px] sm:min-h-[44px] bg-slate-800/50 border border-slate-600/50 hover:border-violet-400/50 hover:bg-slate-700/50 transform transition-all duration-300 ease-out hover:scale-[1.02] flex items-center justify-between backdrop-blur-sm"
                >
                  <span className="text-left truncate pr-2">
                    {currentShowing.name} -{" "}
                    {new Date(currentShowing.startTime).toLocaleString(
                      "vi-VN",
                      {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform shrink-0 ${
                      showingDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showingDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 rounded-md shadow-2xl max-h-60 overflow-y-auto professional-card border border-violet-400/30">
                    {data.showings.map((showing, index) => (
                      <button
                        type="button"
                        key={index}
                        onClick={() => {
                          setSelectedShowing(index);
                          setShowingDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-3 text-left text-xs sm:text-sm border-b border-slate-600 last:border-b-0 transform transition-all duration-200 ease-out hover:translate-x-2 hover:shadow-sm ${
                          index === selectedShowing
                            ? "bg-violet-400/20 text-violet-400"
                            : "text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        <div className="font-medium">{showing.name}</div>
                        <div className="text-xs text-slate-400 mt-1">
                          {new Date(showing.startTime).toLocaleString("vi-VN", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          -{" "}
                          {new Date(showing.endTime).toLocaleString("vi-VN", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Single showing display */}
          {data.showings.length === 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs sm:text-sm text-slate-300 mt-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400" />
                <span>{t("showings")}:</span>
              </div>
              <span className="font-medium break-all text-white">
                {currentShowing.name} -{" "}
                {new Date(currentShowing.startTime).toLocaleString("vi-VN", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                ~{" "}
                {new Date(currentShowing.endTime).toLocaleString("vi-VN", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}

          <div className="mt-3 sm:mt-4 lg:mt-6 w-full flex flex-col lg:flex-row gap-3 sm:gap-4 lg:gap-6">
            {/* Professional description section */}
            <div className="w-full lg:w-2/3 p-2 sm:p-3 lg:p-4 max-h-[300px] sm:max-h-[400px] lg:max-h-[800px] overflow-y-auto border border-slate-700/30 rounded-lg transform transition-all duration-500 ease-out hover:shadow-lg hover:border-violet-400/50 group professional-card">
              <h3 className="text-white font-semibold mb-2 text-sm sm:text-base transform transition-all duration-300 ease-out group-hover:text-violet-400 group-hover:scale-100">
                {t("description")}
              </h3>
              <div
                className="prose prose-sm sm:prose max-w-none text-slate-300"
                dangerouslySetInnerHTML={{ __html: data.description }}
              />
            </div>

            {/* Poster + Location section */}
            <div className="w-full lg:w-1/3 flex flex-col gap-2 sm:gap-3 lg:gap-4">
              {/* Professional poster */}
              <div className="aspect-[3/4] w-full max-w-sm mx-auto lg:max-w-full rounded-lg overflow-hidden shadow-xl border border-slate-700/30 transform transition-all duration-500 ease-out hover:shadow-2xl hover:scale-105 group professional-card">
                {data.posterUrl ? (
                  <div className="relative w-full h-full">
                    <img
                      src={data.posterUrl}
                      alt="Poster"
                      className="w-full h-full object-cover transform transition-transform duration-500 ease-out group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-slate-900/5 transition-all duration-300"></div>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <span className="text-sm text-white">No poster</span>
                  </div>
                )}
              </div>

              {/* Professional location */}
              <div className="flex items-start gap-2 px-2 transform transition-all duration-300 ease-out hover:translate-x-1 group">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400 shrink-0 mt-0.5 transition-transform duration-300 group-hover:scale-110" />
                <span className="text-xs sm:text-sm text-white break-words group-hover:text-violet-400 transition-colors duration-300">
                  {data.location}
                </span>
              </div>

              {/* Professional map */}
              <div className="h-[200px] sm:h-[240px] w-full rounded-lg border border-slate-700/30 shadow-xl overflow-hidden transform transition-all duration-500 ease-out hover:shadow-2xl hover:scale-[1.02] professional-card">
                <iframe
                  className="w-full h-full rounded-lg"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(data.location)}&output=embed`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </section>

        <section className="professional-card rounded-lg p-4 shadow-xl mt-4 sm:mt-6 lg:mt-8">
          <h2 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2 transform transition-all duration-300 ease-out hover:text-violet-400 hover:scale-105 group">
            <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-violet-400 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
            {t("organizerInformation")}
          </h2>

          {data.organizer ? (
            <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3 lg:gap-4 mt-4">
              {data.organizer.avatar && (
                <img
                  src={data.organizer.avatar}
                  alt="Organizer Avatar"
                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border border-slate-600 mx-auto sm:mx-0 transform transition-all duration-500 ease-out hover:scale-110 hover:shadow-lg hover:border-violet-400"
                />
              )}
              <div className="space-y-1 sm:space-y-2 text-slate-300 text-center sm:text-left w-full">
                <p className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                  <span className="flex items-center gap-2 justify-center sm:justify-start">
                    <Landmark className="w-4 h-4 text-violet-400 transition-transform duration-300 hover:scale-110" />
                    <strong className="text-white">{t("name")}</strong>
                  </span>
                  <span className="break-words text-slate-300">
                    {data.organizer.name}
                  </span>
                </p>
                {/* Always show rating in preview mode or when rating exists */}
                {(data.organizer.rating && data.organizer.rating.count > 0) ||
                data.isPreview ? (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                    <span className="flex items-center gap-2 justify-center sm:justify-start">
                      <Star className="w-4 h-4 text-violet-400 transition-transform duration-300 hover:scale-110" />
                      <strong className="text-white">Rating:</strong>
                    </span>
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <InlineRatingStars
                        rating={data.organizer.rating?.average || 4.5}
                        size="sm"
                        showNumber={true}
                      />
                      <span className="text-xs sm:text-sm text-slate-400">
                        ({data.organizer.rating?.count || 125} đánh giá)
                      </span>
                    </div>
                  </div>
                ) : null}
                {data.organizer.website && (
                  <p className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                    <span className="flex items-center gap-2 justify-center sm:justify-start">
                      <Globe className="w-4 h-4 text-violet-400 transition-transform duration-300 hover:scale-110" />
                      <strong className="text-white">{t("website")}</strong>
                    </span>
                    <a
                      href={data.organizer.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 hover:underline break-all text-center sm:text-left transition-colors duration-300"
                    >
                      {data.organizer.website}
                    </a>
                  </p>
                )}
                {data.organizer.address && (
                  <p className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2 text-sm">
                    <span className="flex items-center gap-2 justify-center sm:justify-start">
                      <MapPin className="w-4 h-4 text-violet-400 transition-transform duration-300 hover:scale-110" />
                      <strong className="text-white">{t("address")}</strong>
                    </span>
                    <span className="break-words text-center sm:text-left text-slate-300">
                      {data.organizer.address}
                    </span>
                  </p>
                )}
                {data.organizer.organizerType && (
                  <p className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                    <span className="flex items-center gap-2 justify-center sm:justify-start">
                      <Building2 className="w-4 h-4 text-violet-400 transition-transform duration-300 hover:scale-110" />
                      <strong className="text-white">{t("type")}</strong>
                    </span>
                    <span className="break-words text-center sm:text-left text-slate-300">
                      {data.organizer.organizerType}
                    </span>
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3 lg:gap-4 mt-4">
              <img
                src="https://i.pinimg.com/originals/f2/8b/62/f28b62e3c73e0991d51e6c0dcb412360.gif"
                alt="Organizer Avatar"
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border border-slate-600 mx-auto sm:mx-0 transform transition-all duration-500 ease-out hover:scale-110 hover:shadow-lg hover:border-violet-400"
              />

              <div className="space-y-1 sm:space-y-2 text-slate-300 text-center sm:text-left w-full">
                <p className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                  <span className="flex items-center gap-2 justify-center sm:justify-start">
                    <Landmark className="w-4 h-4 text-violet-400" />
                    <strong className="text-white">{t("name")}</strong>
                  </span>
                  <span className="text-slate-300">Your Name</span>
                </p>

                {/* Always show rating in preview mode */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                  <span className="flex items-center gap-2 justify-center sm:justify-start">
                    <Star className="w-4 h-4 text-violet-400 transition-transform duration-300 hover:scale-110" />
                    <strong className="text-white">Rating:</strong>
                  </span>
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <InlineRatingStars
                      rating={4.5}
                      size="sm"
                      showNumber={true}
                    />
                    <span className="text-xs sm:text-sm text-slate-400">
                      (125 đánh giá)
                    </span>
                  </div>
                </div>

                <p className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                  <span className="flex items-center gap-2 justify-center sm:justify-start">
                    <Globe className="w-4 h-4 text-violet-400" />
                    <strong className="text-white">{t("website")}</strong>
                  </span>
                  <a
                    href=""
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors duration-300"
                  >
                    Your Website
                  </a>
                </p>

                <p className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                  <span className="flex items-center gap-2 justify-center sm:justify-start">
                    <MapPin className="w-4 h-4 text-violet-400" />
                    <strong className="text-white">{t("address")}</strong>
                  </span>
                  <span className="text-slate-300">Your Address</span>
                </p>

                <p className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                  <span className="flex items-center gap-2 justify-center sm:justify-start">
                    <Building2 className="w-4 h-4 text-violet-400" />
                    <strong className="text-white">{t("type")}</strong>
                  </span>
                  <span className="text-slate-300">Your Type</span>
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Rating Section using integrated RatingWidget */}
        <section className="mt-4 sm:mt-6 lg:mt-8">
          <RatingWidget eventId={data.eventId} isPreview={data.isPreview} />
        </section>

        {/* Rating List Section */}
        <section className="mt-4">
          <RatingList eventId={data.eventId} isPreview={data.isPreview} />
        </section>
      </div>
    </>
  );
}
