"use client";

import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Calendar, Eye } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { EventSummary } from '@/lib/queries/events';
import { formatTimeRange, formatCurrencyVND } from '@/lib/utils';

interface NewEventsSliderProps {
  events: EventSummary[];
}

export default function NewEventsSlider({ events }: NewEventsSliderProps) {
  const t = useTranslations("home");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  // Sắp xếp events theo thời gian tạo gần nhất (newest first) và lấy 15 sự kiện
  const newEvents = events
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 15);

  // Xử lý sự kiện scroll để ẩn/hiện nút điều hướng
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  // Hàm cuộn sang trái/phải
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const scrollAmount = 260; // Adjusted for smaller cards
      
      if (direction === 'left') {
        current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  };

  useEffect(() => {
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener('scroll', handleScroll);
      handleScroll();
    }
    return () => {
      if (ref) ref.removeEventListener('scroll', handleScroll);
    };
  }, []);

  if (newEvents.length === 0) {
    return null;
  }

  return (
    <section className="mb-12">
      <div className="w-full max-w-7xl mx-auto">
        {/* Header Title */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">✨</span>
          <h2 className="text-2xl md:text-3xl font-bold text-white glow-text">
            <div className="bg-gradient-to-r from-violet-400 via-violet-300 to-indigo-400 bg-clip-text text-transparent uppercase tracking-wide">
              {t("newEvents.title") || "Sự kiện mới"}
            </div>
          </h2>
        </div>

        {/* Slider Wrapper */}
        <div className="relative group">
          {/* Nút Previous */}
          {showLeftArrow && (
            <button 
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-20 bg-slate-800/80 hover:bg-slate-700/90 text-white p-3 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm border border-violet-400/30 hover:border-violet-400/50"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          {/* Nút Next */}
          {showRightArrow && (
            <button 
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-20 bg-slate-800/80 hover:bg-slate-700/90 text-white p-3 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm border border-violet-400/30 hover:border-violet-400/50"
            >
              <ChevronRight size={24} />
            </button>
          )}

          {/* Scroll Container */}
          <div 
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-8 pt-4 px-2 snap-x snap-mandatory scrollbar-hide"
            style={{ 
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            {newEvents.map((event) => (
              <Link 
                key={event.id} 
                href={`/events/${event.slug}`}
                className="flex-none w-[200px] md:w-[240px] snap-start group/card cursor-pointer"
              >
                {/* Poster Only Card */}
                <div className="relative overflow-hidden rounded-xl shadow-lg border border-slate-700/30 hover:border-violet-400/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-violet-500/20 aspect-[3/4]">
                  {/* Poster Image - Full Size */}
                  <div className="relative w-full h-full overflow-hidden">
                    {event.posterUrl ? (
                      <Image 
                        src={event.posterUrl} 
                        alt={event.name} 
                        fill
                        className="object-cover transition-transform duration-500 group-hover/card:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-400">
                        <span className="text-center">No Poster</span>
                      </div>
                    )}
                    
                    {/* "NEW" Badge */}
                    <div className="absolute top-2 right-2 bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg animate-pulse">
                      NEW
                    </div>

                    {/* Hover overlay with title */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="text-sm font-bold text-white line-clamp-2 leading-tight">
                          {event.name}
                        </h3>
                      </div>
                    </div>
                  </div>
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