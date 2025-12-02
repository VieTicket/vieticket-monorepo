"use client";

import { IoTicket } from "react-icons/io5";
import React, { useEffect, useRef } from "react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const glowRef = useRef<HTMLDivElement>(null);

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

      {/* Professional Styles */}
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

        .auth-card {
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(30px);
          border: 1px solid rgba(148, 163, 184, 0.2);
          box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.5);
        }
      `}</style>

      <div className="relative z-10 flex min-h-screen flex-col md:flex-row min-w-[320px]">
        {/* Left Panel - Logo and Description */}
        <div className="flex flex-col justify-between w-full md:w-1/3 p-6 md:p-8 lg:p-12">
          {/* Logo */}
          <Link className="flex items-center group" href="/">
            <div className="relative">
              <IoTicket
                size={40}
                className="text-violet-400 transition-all duration-300 group-hover:scale-110 group-hover:text-yellow-300"
              />
              <div className="absolute -inset-1 bg-violet-400/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <h1 className="text-3xl text-white font-bold ml-3 glow-text transition-all duration-300 group-hover:text-violet-300">
              VieTicket
            </h1>
          </Link>

          {/* Description - Hidden on mobile, visible on md and up */}
          <div className="pt-12 h-full max-md:hidden md:flex md:flex-col justify-between">
            <div className="text-slate-300">
              <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold mb-6 leading-relaxed text-white glow-text">
                Discover and book your favorite events with ease.
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-8">
                In VieTicket, you explore upcoming shows, secure your tickets
                instantly, and enjoy a smooth, reliable experience from start to
                finish.
              </p>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-violet-400/10 border border-violet-400/20">
                  <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
                  <span className="text-slate-300">
                    Instant ticket confirmation
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-violet-400/10 border border-violet-400/20">
                  <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
                  <span className="text-slate-300">
                    Secure payment processing
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-violet-400/10 border border-violet-400/20">
                  <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
                  <span className="text-slate-300">24/7 customer support</span>
                </div>
              </div>
            </div>
            <div className="text-violet-300 text-sm md:text-base font-medium">
              Thank you for choosing us. Enjoy the event! ✨
            </div>
          </div>
        </div>

        {/* Right Panel - Auth Form */}
        <div className="flex-1 md:w-2/3 flex justify-center items-center p-6 md:p-8">
          <div className="w-full max-w-md">
            <div className="auth-card rounded-xl p-8 transition-all duration-500 hover:shadow-2xl">
              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
