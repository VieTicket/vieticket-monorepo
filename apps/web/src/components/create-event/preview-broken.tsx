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
import { RatingStars } from "../ui/rating-stars";

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

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
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
      <div 
        className="fixed inset-0 bg-slate-950"
        style={{ zIndex: 0 }}
      />
      
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
          background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, rgba(139,92,246,0) 70%)',
          filter: 'blur(20px)',
          transform: 'translate(-50%, -50%)',
          zIndex: 2
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
          box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.3), 
                      0 0 20px rgba(139, 92, 246, 0.1);
          transform: translateY(-2px);
        }
        
        .glow-text {
          text-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
        }
        
        .professional-button {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(79, 70, 229, 0.1));
          border: 1px solid rgba(139, 92, 246, 0.3);
          transition: all 0.3s ease;
        }
        
        .professional-button:hover {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(79, 70, 229, 0.2));
          border: 1px solid rgba(139, 92, 246, 0.5);
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
          transform: scale(1.02);
        }
      `}</style>

      <div className="relative z-10">
      <header className="relative flex flex-col lg:flex-row professional-card rounded-lg sm:rounded-xl overflow-hidden shadow-xl">

        <div className="w-full lg:w-[30%] p-2 sm:p-3 lg:p-6 flex flex-col justify-between z-20 professional-card rounded-lg sm:rounded-xl border lg:border-r-0 order-2 lg:order-1 relative group">
          {/* Clean ticket tear lines */}
          <div className="absolute -right-5 -top-5 w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-slate-600/50 z-50 hidden lg:block bg-slate-900/80" />
          <div className="absolute -right-5 -bottom-5 w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-slate-600/50 z-50 hidden lg:block bg-slate-900/80" />
          
          <div className="space-y-2 sm:space-y-3 lg:space-y-4">
            <div>
              <h1 className="text-base sm:text-lg lg:text-2xl font-bold text-white line-clamp-2 leading-tight transform transition-all duration-300 ease-out group-hover:text-violet-400 group-hover:scale-105 glow-text">{data.name}</h1>
              <p className="text-xs text-slate-400">{data.type}</p>
            </div>

            <div className="space-y-1 text-xs sm:text-sm text-slate-300">
              <div>
                <strong className="text-violet-400">{t("startDate")}</strong>{" "}
                {eventStartDate ? formatDateVi(eventStartDate) : t("noShowing")}
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
                  className="w-full px-3 py-2 text-sm font-medium text-white professional-button rounded-lg flex items-center justify-center gap-2 group"
                  onClick={() => {
                    console.log('So sánh sự kiện:', data.eventId);
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
        <div className="w-full lg:w-[70%] aspect-[16/9] sm:aspect-[16/8] lg:aspect-[16/9] order-1 lg:order-2 lg:border-l-0 lg:border lg:border-slate-700/50 rounded-lg lg:rounded-l-none overflow-hidden group relative z-10 professional-card">
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
              <span className="text-sm sm:text-base text-white">No image</span>
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
            <span className="break-all">
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
            <span className="break-all">
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
          <div className="relative">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-700 mb-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[#2a273f]" />
              <span>{t("showings")}:</span>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowingDropdownOpen(!showingDropdownOpen)}
                className="flex items-center justify-between w-full px-3 py-2 rounded-md text-xs sm:text-sm text-white min-h-[40px] sm:min-h-[44px] transform transition-all duration-200 ease-out hover:scale-[1.02] glow-button"
              >
                <span className="text-left truncate pr-2">
                  {currentShowing.name} -{" "}
                  {new Date(currentShowing.startTime).toLocaleString("vi-VN", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform shrink-0 ${
                    showingDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showingDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 rounded-md shadow-2xl max-h-60 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,223,32,0.3)' }}>
                  {data.showings.map((showing, index) => (
                    <button
                      type="button"
                      key={index}
                      onClick={() => {
                        setSelectedShowing(index);
                        setShowingDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-3 text-left text-xs sm:text-sm border-b border-gray-600 last:border-b-0 transform transition-all duration-200 ease-out hover:translate-x-2 hover:shadow-sm ${
                        index === selectedShowing
                          ? "bg-yellow-400/20 text-yellow-400"
                          : "text-gray-300 hover:bg-white/10"
                      }`}
                    >
                      <div className="font-medium">{showing.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
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
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs sm:text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[#2a273f]" />
              <span>{t("showings")}:</span>
            </div>
            <span className="font-medium break-all">
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
            <h3 className="text-white font-semibold mb-2 text-sm sm:text-base transform transition-all duration-300 ease-out group-hover:text-violet-400 group-hover:scale-105">{t("description")}</h3>
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
              <span className="text-xs sm:text-sm text-white break-words group-hover:text-violet-400 transition-colors duration-300">{data.location}</span>
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
          <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3 lg:gap-4">
            {data.organizer.avatar && (
              <img
                src={data.organizer.avatar}
                alt="Organizer Avatar"
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border border-slate-600 mx-auto sm:mx-0 transform transition-all duration-500 ease-out group-hover:scale-110 group-hover:shadow-lg group-hover:border-violet-400"
              />
            )}
            <div className="space-y-1 sm:space-y-2 text-slate-300 text-center sm:text-left w-full">
              <p className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                <span className="flex items-center gap-2 justify-center sm:justify-start">
                    <Landmark className="w-4 h-4 text-violet-400 transition-transform duration-300 hover:scale-110" />
                  <strong className="text-white">{t("name")}</strong>
                </span>
                <span className="break-words text-slate-300">{data.organizer.name}</span>
              </p>
              {data.organizer.rating && data.organizer.rating.count > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                  <span className="flex items-center gap-2 justify-center sm:justify-start">
                    <Star className="w-4 h-4 text-[#2a273f] animate-pulse-slow" />
                    <strong>Rating:</strong>
                  </span>
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <RatingStars 
                      rating={data.organizer.rating.average} 
                      size="sm"
                      showNumber={true}
                    />
                    <span className="text-xs sm:text-sm text-gray-500">
                      ({data.organizer.rating.count} đánh giá)
                    </span>
                  </div>
                </div>
              )}
              {data.organizer.website && (
                <p className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                  <span className="flex items-center gap-2 justify-center sm:justify-start">
                    <Globe className="w-4 h-4 text-[#2a273f] animate-spin-slow" />
                    <strong>{t("website")}</strong>
                  </span>
                  <a
                    href={data.organizer.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all text-center sm:text-left"
                  >
                    {data.organizer.website}
                  </a>
                </p>
              )}
              {data.organizer.address && (
                <p className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2 text-sm">
                  <span className="flex items-center gap-2 justify-center sm:justify-start">
                    <MapPin className="w-4 h-4 text-[#2a273f] animate-bounce-slow" />
                    <strong>{t("address")}</strong>
                  </span>
                  <span className="break-words text-center sm:text-left">{data.organizer.address}</span>
                </p>
              )}
              {data.organizer.organizerType && (
                <p className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                  <span className="flex items-center gap-2 justify-center sm:justify-start">
                    <Building2 className="w-4 h-4 text-[#2a273f] animate-pulse-slow" />
                    <strong>{t("type")}</strong>
                  </span>
                  <span className="break-words text-center sm:text-left">{data.organizer.organizerType}</span>
                </p>
              )}
            </div>
          </div>
              {data.organizer.rating && data.organizer.rating.count > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                  <span className="flex items-center gap-2 justify-center sm:justify-start">
                    <Star className="w-4 h-4 text-violet-400 transition-transform duration-300 hover:scale-110" />
                    <strong className="text-white">Rating:</strong>
                  </span>
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <RatingStars 
                      rating={data.organizer.rating.average} 
                      size="sm"
                      showNumber={true}
                    />
                    <span className="text-xs sm:text-sm text-slate-400">
                      ({data.organizer.rating.count} đánh giá)
                    </span>
                  </div>
                </div>
              )}
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
                  <span className="break-words text-center sm:text-left text-slate-300">{data.organizer.address}</span>
                </p>
              )}
              {data.organizer.organizerType && (
                <p className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                  <span className="flex items-center gap-2 justify-center sm:justify-start">
                    <Building2 className="w-4 h-4 text-violet-400 transition-transform duration-300 hover:scale-110" />
                    <strong className="text-white">{t("type")}</strong>
                  </span>
                  <span className="break-words text-center sm:text-left text-slate-300">{data.organizer.organizerType}</span>
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3 lg:gap-4">
            <img
              src="https://i.pinimg.com/originals/f2/8b/62/f28b62e3c73e0991d51e6c0dcb412360.gif"
              alt="Organizer Avatar"
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border border-slate-600 mx-auto sm:mx-0 transform transition-all duration-500 ease-out group-hover:scale-110 group-hover:shadow-lg group-hover:border-violet-400"
            />

            <div className="space-y-1 sm:space-y-2 text-slate-300 text-center sm:text-left w-full">
              <p className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                <span className="flex items-center gap-2 justify-center sm:justify-start">
                  <Landmark className="w-4 h-4 text-violet-400" />
                  <strong className="text-white">{t("name")}</strong>
                </span>
                <span className="text-slate-300">Your Name</span>
              </p>

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
      </div>
    </>
  );
}
