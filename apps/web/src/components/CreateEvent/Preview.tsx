"use client";

import React from "react";
import { Ticket } from "lucide-react"; // Cài: npm install lucide-react

export type EventPreviewData = {
  bannerUrl: string;
  name: string;
  slug: string;
  type: string;
  location: string;
  description: string;
  startTime: string;
  endTime: string;
  ticketSaleStart: string;
  ticketSaleEnd: string;
  posterUrl?: string;
  organizerId: string;
};

type Props = {
  data: EventPreviewData;
};

export function PreviewEvent({ data }: Props) {
  return (
    <>
      <header className="relative flex flex-col md:flex-row bg-white rounded-xl overflow-hidden ">
        {/* Rãnh xé trên: nửa dưới hình tròn */}
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
                {data.startTime}
              </div>
              <div>
                <strong className="text-[#2a273f]">End Date:</strong>{" "}
                {data.endTime}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 space-y-4">
            <p className="text-lg font-semibold text-[#2a273f]">
              Just <span className="text-[#ffdf20]">X.XXX.000 VNĐ</span>
            </p>

            <button className="flex items-center justify-center gap-2 bg-[#ffdf20] text-[#2a273f] px-6 py-3 rounded-xl font-semibold hover:bg-yellow-300 transition-colors duration-200 w-full">
              <Ticket className="w-5 h-5" />
              Buy Tickets
            </button>
          </div>
        </div>

        {/* Đường viền đứt nét (xé vé) */}
        <div className="hidden md:block w-[1px] border-l border-dashed border-black z-10" />

        {/* Right: Hình ảnh (70%) */}
        <div className="w-full md:w-[70%]">
          {data.bannerUrl ? (
            <img
              src={data.bannerUrl}
              alt="Banner"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
              No image
            </div>
          )}
        </div>
      </header>

      <section className="border-t pt-6 space-y-3">
        <p>
          <span className="font-semibold text-gray-700">
            Ticket Sale Starts :
          </span>{" "}
          {data.ticketSaleStart}
        </p>
        <p>
          <span className="font-semibold text-gray-700">
            Ticket Sale Ends :
          </span>{" "}
          {data.ticketSaleEnd}
        </p>
        <div>
          <p>
            <span className="font-semibold text-gray-700">Location :</span>{" "}
            {data.location}
          </p>
          <div className="mt-4 flex flex-col md:flex-row gap-4 w-full">
            {/* Bên trái: Map */}
            <div className="w-full md:w-1/2 h-64 rounded-lg overflow-hidden shadow-md border border-gray-200">
              <iframe
                className="w-full h-full"
                src={`https://www.google.com/maps?q=${encodeURIComponent(data.location)}&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>

            <div className="w-full md:w-1/2 h-full flex items-center justify-center ">
              {data.posterUrl ? (
                <img
                  src={data.posterUrl}
                  alt="Poster"
                  className="max-h-full max-w-[400px] object-contain rounded-lg overflow-hidden shadow-md border border-gray-200"
                />
              ) : (
                <img
                  // src={data.posterUrl}
                  src="https://ticketbox.vn/_next/image?url=https%3A%2F%2Fimages.tkbcdn.com%2F2%2F360%2F479%2Fts%2Fds%2Fac%2F2c%2F39%2Fa24ca816d93d1a353c845ff18e7b53e8.jpg&w=384&q=75"
                  alt="Poster"
                  className="max-h-full w-full max-w-[800px] object-contain rounded-lg overflow-hidden shadow-md border border-gray-200"
                />
              )}
            </div>
          </div>
        </div>
        <div>
          {" "}
          <span className="font-semibold text-gray-700">Description :</span>
          <div
            className="prose max-w-none mt-2 text-gray-700"
            dangerouslySetInnerHTML={{ __html: data.description }}
          />
        </div>
      </section>

      <section className="border-t pt-6 space-y-3"></section>

      {/* <section className="border-t pt-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">
          Thông tin nhà tổ chức{" "}
        </h2>
        <h2>{data.organizerId}</h2>
      </section> */}
    </>
  );
}
