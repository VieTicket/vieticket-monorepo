"use client"; // Why

import React, { useState } from "react";
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

  const currentShowing = data.showings[selectedShowing] || data.showings[0];

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
      <header className="relative flex flex-col lg:flex-row bg-white rounded-lg sm:rounded-xl overflow-hidden shadow-md">

        <div className="w-full lg:w-[30%] p-2 sm:p-3 lg:p-6 flex flex-col justify-between z-0 bg-white rounded-lg sm:rounded-xl border lg:border-r-0 border-black-600 shadow-md order-2 lg:order-1 relative">
          {/* Rãnh xé trên - positioned relative to this container */}
          <div className="absolute -right-5 -top-5 w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-full border border-black-600 z-30 overflow-hidden hidden lg:block" />
          {/* Rãnh xé dưới - positioned relative to this container */}
          <div className="absolute -right-5 -bottom-5 w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-full border border-black-600 z-30 overflow-hidden hidden lg:block" />
          <div className="space-y-2 sm:space-y-3 lg:space-y-4">
            <div>
              <h1 className="text-base sm:text-lg lg:text-2xl font-bold text-[#2a273f] line-clamp-2 leading-tight">{data.name}</h1>
              <p className="text-xs text-gray-500">{data.type}</p>
            </div>

            <div className="space-y-1 text-xs sm:text-sm text-gray-700">
              <div>
                <strong className="text-[#2a273f]">{t("startDate")}</strong>{" "}
                {eventStartDate ? formatDateVi(eventStartDate) : t("noShowing")}
              </div>
              <div>
                <strong className="text-[#2a273f]">{t("endDate")}</strong>{" "}
                {eventEndDate ? formatDateVi(eventEndDate) : t("noShowing")}
              </div>
            </div>
          </div>

          <div className="mt-2 sm:mt-3 lg:mt-6 pt-2 sm:pt-3 border-t border-gray-200 space-y-2 sm:space-y-3">
            <p className="text-sm sm:text-base lg:text-xl font-semibold text-[#2a273f]">
              {t("from")}{" "}
              <span className="text-[#ffdf20]">
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
              {/* Nút so sánh sự kiện - dễ tiếp cận hơn */}
              {!data.isPreview && (
                <button
                  className="w-full px-3 py-2 text-sm font-medium text-[#2a273f] bg-white border-2 border-[#2a273f] rounded-lg hover:bg-[#2a273f] hover:text-white transition-colors duration-200 flex items-center justify-center gap-2"
                  onClick={() => {
                    // Logic so sánh sự kiện
                    console.log('So sánh sự kiện:', data.eventId);
                  }}
                >
                  <Star className="w-4 h-4" />
                  So sánh sự kiện
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Hình ảnh */}
        <div className="w-full lg:w-[70%] aspect-[16/9] sm:aspect-[16/8] lg:aspect-[16/9] order-1 lg:order-2 lg:border-l-0 lg:border lg:border-black-600 rounded-lg lg:rounded-l-none">
          {data.bannerUrl ? (
            <img
              src={data.bannerUrl}
              alt="Banner"
              className="w-full h-full object-cover rounded-t-lg sm:rounded-t-xl lg:rounded-l-none lg:rounded-r-xl"
            />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 rounded-t-lg sm:rounded-t-xl lg:rounded-l-none lg:rounded-r-xl">
              <span className="text-sm sm:text-base">No image</span>
            </div>
          )}
        </div>
      </header>

      <section className="border-t pt-3 sm:pt-4 lg:pt-6 space-y-2 sm:space-y-3 mt-3 sm:mt-4 lg:mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs sm:text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 sm:w-5 sm:h-5 text-[#2a273f]" />
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
            <span className="text-[#2a273f] hidden sm:inline">~</span>
            <span className="text-[#2a273f] sm:hidden">đến</span>
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
                className="flex items-center justify-between w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-xs sm:text-sm text-gray-700 hover:bg-gray-50 min-h-[40px] sm:min-h-[44px]"
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
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {data.showings.map((showing, index) => (
                    <button
                      type="button"
                      key={index}
                      onClick={() => {
                        setSelectedShowing(index);
                        setShowingDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-3 text-left text-xs sm:text-sm hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                        index === selectedShowing
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-700"
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
          {/* Description bên trái */}
          <div className="w-full lg:w-2/3 p-2 sm:p-3 lg:p-4 max-h-[300px] sm:max-h-[400px] lg:max-h-[800px] overflow-y-auto border border-gray-200 rounded-lg">
            <h3 className="text-[#2a273f] font-semibold mb-2 text-sm sm:text-base">{t("description")}</h3>
            <div
              className="prose prose-sm sm:prose max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: data.description }}
            />
          </div>

          {/* Poster + Location bên phải */}
          <div className="w-full lg:w-1/3 flex flex-col gap-2 sm:gap-3 lg:gap-4">
            {/* Poster */}
            <div className="aspect-[3/4] w-full max-w-sm mx-auto lg:max-w-full rounded-lg overflow-hidden shadow-md border border-gray-200">
              {data.posterUrl ? (
                <img
                  src={data.posterUrl}
                  alt="Poster"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                  <span className="text-sm">No poster</span>
                </div>
              )}
            </div>

            {/* Location */}
            <div className="flex items-start gap-2 px-2">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-[#2a273f] shrink-0 mt-0.5" />
              <span className="text-xs sm:text-sm text-[#2a273f] break-words">{data.location}</span>
            </div>

            {/* Google Map */}
            <div className="h-[200px] sm:h-[240px] w-full rounded-lg border border-gray-200 shadow-md overflow-hidden">
              <iframe
                className="w-full h-full"
                src={`https://www.google.com/maps?q=${encodeURIComponent(data.location)}&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t pt-3 sm:pt-4 lg:pt-6 space-y-2 sm:space-y-3 mt-4 sm:mt-6 lg:mt-8">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-[#2a273f]" />
          {t("organizerInformation")}
        </h2>

        {data.organizer ? (
          <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3 lg:gap-4">
            {data.organizer.avatar && (
              <img
                src={data.organizer.avatar}
                alt="Organizer Avatar"
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border border-gray-300 mx-auto sm:mx-0"
              />
            )}
            <div className="space-y-1 sm:space-y-2 text-gray-700 text-center sm:text-left w-full">
              <p className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                <span className="flex items-center gap-2 justify-center sm:justify-start">
                  <Landmark className="w-4 h-4 text-[#2a273f]" />
                  <strong>{t("name")}</strong>
                </span>
                <span className="break-words">{data.organizer.name}</span>
              </p>
              {data.organizer.rating && data.organizer.rating.count > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                  <span className="flex items-center gap-2 justify-center sm:justify-start">
                    <Star className="w-4 h-4 text-[#2a273f]" />
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
                    <Globe className="w-4 h-4 text-[#2a273f]" />
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
                    <MapPin className="w-4 h-4 text-[#2a273f]" />
                    <strong>{t("address")}</strong>
                  </span>
                  <span className="break-words text-center sm:text-left">{data.organizer.address}</span>
                </p>
              )}
              {data.organizer.organizerType && (
                <p className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                  <span className="flex items-center gap-2 justify-center sm:justify-start">
                    <Building2 className="w-4 h-4 text-[#2a273f]" />
                    <strong>{t("type")}</strong>
                  </span>
                  <span className="break-words text-center sm:text-left">{data.organizer.organizerType}</span>
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3 lg:gap-4">
            <img
              src="https://i.pinimg.com/originals/f2/8b/62/f28b62e3c73e0991d51e6c0dcb412360.gif"
              alt="Organizer Avatar"
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border border-gray-300 mx-auto sm:mx-0"
            />

            <div className="space-y-1 sm:space-y-2 text-gray-700 text-center sm:text-left w-full">
              <p className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                <span className="flex items-center gap-2 justify-center sm:justify-start">
                  <Landmark className="w-4 h-4 text-[#2a273f]" />
                  <strong>{t("name")}</strong>
                </span>
                <span>Your Name</span>
              </p>

              <p className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                <span className="flex items-center gap-2 justify-center sm:justify-start">
                  <Globe className="w-4 h-4 text-[#2a273f]" />
                  <strong>{t("website")}</strong>
                </span>
                <a
                  href=""
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Your Website
                </a>
              </p>

              <p className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                <span className="flex items-center gap-2 justify-center sm:justify-start">
                  <MapPin className="w-4 h-4 text-[#2a273f]" />
                  <strong>{t("address")}</strong>
                </span>
                <span>Your Address</span>
              </p>

              <p className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                <span className="flex items-center gap-2 justify-center sm:justify-start">
                  <Building2 className="w-4 h-4 text-[#2a273f]" />
                  <strong>{t("type")}</strong>
                </span>
                <span>Your Type</span>
              </p>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
