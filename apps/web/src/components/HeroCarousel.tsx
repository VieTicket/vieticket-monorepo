"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const t = useTranslations("home.carousel");
  const videos = [
    {
      src: "https://res.cloudinary.com/duwvn7qqf/video/upload/v1721360508/banner1.mp4",
      title: t("slide1.title"),
      subtitle: t("slide1.subtitle"),
    },
    {
      src: "https://res.cloudinary.com/duwvn7qqf/video/upload/v1721360111/banner2.mp4",
      title: t("slide2.title"),
      subtitle: t("slide2.subtitle"),
    },
    {
      src: "https://res.cloudinary.com/duwvn7qqf/video/upload/v1721360106/banner3.mp4",
      title: t("slide3.title"),
      subtitle: t("slide3.subtitle"),
    },
  ];

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

      {/* Professional Dark Overlay with Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-900/80" />
      <div className="absolute inset-0 bg-gradient-to-r from-violet-900/20 via-transparent to-indigo-900/20" />

      {/* Text with Professional Styling */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center text-white px-4 transition-opacity duration-1000">
        <h1 className="text-4xl md:text-6xl font-bold drop-shadow-lg glow-text mb-4">
          {videos[current].title}
        </h1>
        <h2 className="text-lg md:text-2xl font-medium text-violet-200 drop-shadow mt-2 bg-slate-900/20 backdrop-blur-sm px-6 py-3 rounded-full border border-violet-400/30">
          {videos[current].subtitle}
        </h2>
        
        {/* Professional accent line */}
        <div className="mt-8 w-24 h-1 bg-gradient-to-r from-violet-400 to-indigo-400 rounded-full shadow-lg shadow-violet-400/30"></div>
      </div>

      {/* Professional indicator dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 bg-slate-900/30 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-700/30">
        {videos.map((_, index) => (
          <button
            key={index}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === current 
                ? "bg-violet-400 scale-110 shadow-lg shadow-violet-400/50" 
                : "bg-slate-500/50 hover:bg-slate-400/70"
            }`}
            onClick={() => setCurrent(index)}
          />
        ))}
      </div>
    </section>
  );
}
