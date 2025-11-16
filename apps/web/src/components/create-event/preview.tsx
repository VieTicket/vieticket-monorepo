"use client"; // Why

import React, { useState } from "react";
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
      <header className="relative flex flex-col md:flex-row bg-white rounded-xl overflow-hidden ">
        {/* Rãnh xé trên: nửa dưới hình tròn */}
        <div className="absolute left-[30%] -top-5 transform -translate-x-1/2 w-10 h-10 bg-white rounded-full border border-black-600 z-20 overflow-hidden" />

        {/* Rãnh xé dưới: nửa trên hình tròn */}
        <div className="absolute left-[30%] -bottom-5 transform -translate-x-1/2 w-10 h-10 bg-white rounded-full border border-black-600 z-20 overflow-hidden" />

        <div className="w-full md:w-[30%] p-6 flex flex-col justify-between z-0 bg-white rounded-xl border border-black-600 shadow-md">
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold text-[#2a273f]">{data.name}</h1>
              <p className="text-sm text-gray-500">{data.type}</p>
            </div>

            <div className="space-y-2 text-sm text-gray-700">
              <div>
                <strong className="text-[#2a273f]">Start Date:</strong>{" "}
                {eventStartDate ? formatDateVi(eventStartDate) : "No showing"}
              </div>
              <div>
                <strong className="text-[#2a273f]">End Date:</strong>{" "}
                {eventEndDate ? formatDateVi(eventEndDate) : "No showing"}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 space-y-4">
            <p className="text-lg font-semibold text-[#2a273f]">
              Just{" "}
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

            <BuyTicketButton
              eventSlug={data.slug}
              eventId={data.eventId}
              isPreview={data.isPreview}
            />
          </div>
        </div>

        {/* Đường viền đứt nét (xé vé) */}
        <div className="hidden md:block w-[1px] border-l border-dashed border-black z-10" />

        {/* Right: Hình ảnh (70%) */}
        <div className="w-full md:w-[70%] aspect-[16/9]">
          {data.bannerUrl ? (
            <img
              src={data.bannerUrl}
              alt="Banner"
              className="w-full h-full object-cover rounded-r-xl"
            />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 rounded-r-xl">
              No image
            </div>
          )}
        </div>
      </header>

      <section className="border-t pt-6 space-y-3 mt-5">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Ticket className="w-5 h-5 text-[#2a273f]" />
          <span>Ticket Sale:</span>
          <span>
            {new Date(data.ticketSaleStart).toLocaleString("vi-VN", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <span className="text-[#2a273f]">~</span>
          <span>
            {new Date(data.ticketSaleEnd).toLocaleString("vi-VN", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {/* Showings Dropdown */}
        {data.showings.length > 1 && (
          <div className="relative">
            <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
              <Clock className="w-5 h-5 text-[#2a273f]" />
              <span>Available Showings:</span>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowingDropdownOpen(!showingDropdownOpen)}
                className="flex items-center justify-between w-full max-w-md px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                <span>
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
                  className={`w-4 h-4 transition-transform ${showingDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {showingDropdownOpen && (
                <div className="absolute z-10 w-full max-w-md mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                  {data.showings.map((showing, index) => (
                    <button
                      type="button"
                      key={index}
                      onClick={() => {
                        setSelectedShowing(index);
                        setShowingDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                        index === selectedShowing
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-700"
                      }`}
                    >
                      <div className="font-medium">{showing.name}</div>
                      <div className="text-xs text-gray-500">
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
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Clock className="w-5 h-5 text-[#2a273f]" />
            <span>Showing:</span>
            <span className="font-medium">
              {currentShowing.name} -{" "}
              {new Date(currentShowing.startTime).toLocaleString("vi-VN", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              to{" "}
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

        <div className="mt-6 w-full md:flex md:flex-row gap-4">
          {/* Description bên trái */}
          <div className="w-full md:w-2/3 p-4 max-h-[800px] overflow-y-auto">
            <h3 className="text-[#2a273f] font-semibold mb-2">Description</h3>
            <div
              className="prose max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: data.description }}
            />
          </div>

          {/* Poster + Location bên phải */}
          <div className="w-full md:w-1/3 flex flex-col gap-4">
            {/* Poster */}
            <div className="aspect-[3/4] w-full rounded-lg overflow-hidden shadow-md border border-gray-200">
              {data.posterUrl ? (
                <img
                  src={data.posterUrl}
                  alt="Poster"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                  No poster
                </div>
              )}
            </div>

            {/* Location */}
            <div className="flex items-start gap-2">
              <MapPin className="w-5 h-5 text-[#2a273f]" />
              <span className="text-sm text-[#2a273f]">{data.location}</span>
            </div>

            {/* Google Map */}
            <div className="h-[240px] w-full rounded-lg border border-gray-200 shadow-md overflow-hidden">
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

      <section className="border-t pt-6 space-y-4 mt-8">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Building2 className="w-6 h-6 text-[#2a273f]" />
          Organizer Information
        </h2>

        {data.organizer ? (
          <div className="flex items-start gap-4">
            {data.organizer.avatar && (
              <img
                src={data.organizer.avatar}
                alt="Organizer Avatar"
                className="w-16 h-16 rounded-full object-cover border border-gray-300"
              />
            )}
            <div className="space-y-1 text-gray-700">
              <p className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-[#2a273f]" />
                <strong>Name:</strong> {data.organizer.name}
              </p>
              {data.organizer.rating && data.organizer.rating.count > 0 && (
                <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-[#2a273f]" />
                  <strong>Rating:</strong>
                  <RatingStars 
                    rating={data.organizer.rating.average} 
                    size="sm"
                    showNumber={true}
                  />
                  <span className="text-sm text-gray-500">
                    ({data.organizer.rating.count} đánh giá)
                  </span>
                </div>
              )}
              {data.organizer.website && (
                <p className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#2a273f]" />
                  <strong>Website:</strong>{" "}
                  <a
                    href={data.organizer.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {data.organizer.website}
                  </a>
                </p>
              )}
              {data.organizer.address && (
                <p className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#2a273f]" />
                  <strong>Address:</strong> {data.organizer.address}
                </p>
              )}
              {data.organizer.organizerType && (
                <p className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#2a273f]" />
                  <strong>Type:</strong> {data.organizer.organizerType}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-4">
            <img
              src="https://i.pinimg.com/originals/f2/8b/62/f28b62e3c73e0991d51e6c0dcb412360.gif"
              alt="Organizer Avatar"
              className="w-16 h-16 rounded-full object-cover border border-gray-300"
            />

            <div className="space-y-1 text-gray-700">
              <p className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-[#2a273f]" />
                <strong>Name:</strong> Your Name
              </p>

              <p className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#2a273f]" />
                <strong>Website:</strong>{" "}
                <a
                  href=""
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Your Website
                </a>
              </p>

              <p className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#2a273f]" />
                <strong>Address:</strong> Your Address
              </p>

              <p className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#2a273f]" />
                <strong>Type:</strong> Your Type
              </p>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
