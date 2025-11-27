"use client";

import { useEffect, useRef } from "react";

export function HomePageBackground() {
  const glowRef = useRef<HTMLDivElement>(null);

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
    </>
  );
}