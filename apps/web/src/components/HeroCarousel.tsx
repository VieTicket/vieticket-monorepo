"use client";

import { useState, useEffect } from "react";

const videos = [
  {
    src: "https://res.cloudinary.com/duwvn7qqf/video/upload/v1721360508/banner1.mp4",
    title: "Welcome to VieTicket",
    subtitle: "Discover a world of vibrant events waiting for you.",
  },
  {
    src: "https://res.cloudinary.com/duwvn7qqf/video/upload/v1721360111/banner2.mp4",
    title: "Simplified Seat Map Creation",
    subtitle: "Easily design seat maps for any event with ease.",
  },
  {
    src: "https://res.cloudinary.com/duwvn7qqf/video/upload/v1721360106/banner3.mp4",
    title: "Versatile Music Venues",
    subtitle: "Enjoy diverse music genres across our amazing venues.",
  },
];

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % videos.length);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative w-full h-screen overflow-hidden">
      {/* Video background */}
      {videos.map((video, index) => (
        <video
          key={index}
          className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-1000 ${
            index === current ? "opacity-100" : "opacity-0"
          }`}
          src={video.src}
          autoPlay
          muted
          loop
          playsInline
        />
      ))}

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Text (fade bằng Tailwind) */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center text-white px-4 transition-opacity duration-1000">
        <h1 className="text-4xl md:text-6xl font-bold drop-shadow-lg">
          {videos[current].title}
        </h1>
        <h2 className="text-lg md:text-2xl font-medium text-yellow-300 drop-shadow mt-2">
          {videos[current].subtitle}
        </h2>
      </div>

      {/* Indicator dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
        {videos.map((_, index) => (
          <button
            key={index}
            className={`w-3 h-3 rounded-full transition-all ${
              index === current ? "bg-yellow-400 scale-110" : "bg-white/50"
            }`}
            onClick={() => setCurrent(index)}
          />
        ))}
      </div>
    </section>
  );
}
