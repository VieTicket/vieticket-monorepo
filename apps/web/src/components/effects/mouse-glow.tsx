"use client";

import { useEffect, useRef } from "react";

export function MouseGlowEffect() {
  const glowRef = useRef<HTMLDivElement>(null);

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

  return (
    <div 
      ref={glowRef}
      className="fixed w-[400px] h-[400px] rounded-full pointer-events-none mix-blend-mode-screen transition-opacity duration-300"
      style={{
        background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, rgba(139,92,246,0) 70%)',
        filter: 'blur(20px)',
        transform: 'translate(-50%, -50%)',
        zIndex: 999
      }}
    />
  );
}