"use client";

import React, { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, MapPin, Calendar, Eye } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { EventSummary } from "@/lib/queries/events";
import { formatTimeRange, formatCurrencyVND } from "@/lib/utils";

interface TrendingEventsSliderProps {
  events: EventSummary[];
}

export default function TrendingEventsSlider({
  events,
}: TrendingEventsSliderProps) {
  const t = useTranslations("home");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  // Sắp xếp events theo views từ cao xuống thấp và lấy top 10
  const topEvents = events
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 10);

  // Xử lý sự kiện scroll để ẩn/hiện nút điều hướng
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  // Hàm cuộn sang trái/phải
  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const scrollAmount = 400;

      if (direction === "left") {
        current.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      } else {
        current.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }
    }
  };

  useEffect(() => {
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener("scroll", handleScroll);
      handleScroll();
    }
    return () => {
      if (ref) ref.removeEventListener("scroll", handleScroll);
    };
  }, []);

  if (topEvents.length === 0) {
    return null;
  }

  return (
    <section className="mt-5 mx-5">
      <div className="w-full max-w-7xl mx-auto">
        {/* Header Title */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">🔥</span>
          <h2 className="text-2xl md:text-3xl font-bold text-white glow-text">
            <div className="bg-gradient-to-r from-violet-400 via-violet-300 to-indigo-400 bg-clip-text text-transparent uppercase tracking-wide">
              {t("trending.title") || "Sự kiện xu hướng"}
            </div>
          </h2>
        </div>

        {/* Slider Wrapper */}
        <div className="relative group">
          {/* Nút Previous */}
          {showLeftArrow && (
            <button
              onClick={() => scroll("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-20 bg-slate-800/80 hover:bg-slate-700/90 text-white p-3 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm border border-violet-400/30 hover:border-violet-400/50"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          {/* Nút Next */}
          {showRightArrow && (
            <button
              onClick={() => scroll("right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-20 bg-slate-800/80 hover:bg-slate-700/90 text-white p-3 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm border border-violet-400/30 hover:border-violet-400/50"
            >
              <ChevronRight size={24} />
            </button>
          )}

          {/* Scroll Container */}
          <div
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto pb-8 pt-4 px-2 snap-x snap-mandatory scrollbar-hide"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {topEvents.map((event, index) => (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                className="flex-none w-[300px] md:w-[380px] relative snap-start group/card cursor-pointer"
              >
                {/* Số thứ hạng */}
                <div className="absolute -left-4 bottom-0 z-10 select-none pointer-events-none">
                  <span
                    className="text-[120px] font-black leading-none italic opacity-100 transition-transform group-hover/card:scale-110 duration-300"
                    style={{
                      WebkitTextStroke: "2px #8b5cf6",
                      color: "transparent",
                      textShadow: "4px 4px 0px rgba(0,0,0,0.5)",
                    }}
                  >
                    {index + 1}
                  </span>
                </div>

                {/* Card chứa ảnh */}
                <div className="relative ml-10 overflow-hidden rounded-xl shadow-lg border border-slate-700/30 hover:border-violet-400/50 bg-slate-900/80 backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-violet-500/20">
                  {/* Image */}
                  <div className="aspect-[16/9] w-full overflow-hidden relative">
                    {event.bannerUrl ? (
                      <Image
                        src={event.bannerUrl}
                        alt={event.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover/card:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-400">
                        <span>No Image</span>
                      </div>
                    )}
                  </div>

                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent opacity-80" />

                  {/* Nội dung bên trong Card */}
                  {/* <div className="absolute bottom-0 left-0 w-full p-4 pl-12">
                    <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 uppercase drop-shadow-md group-hover/card:text-violet-300 transition-colors duration-300">
                      {event.name}
                    </h3>
                    
                    <div className="flex flex-col gap-2 text-xs text-slate-300 font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-violet-400" />
                        <span>{formatTimeRange(new Date(event.startTime), new Date(event.endTime))}</span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-violet-400" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <Eye size={14} className="text-violet-400" />
                          <span>{event.views || 0} views</span>
                        </div>
                        <span className="text-yellow-400 font-bold">
                          {formatCurrencyVND(event.typicalTicketPrice)}
                        </span>
                      </div>
                    </div>
                  </div> */}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* CSS ẩn scrollbar */}
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}
