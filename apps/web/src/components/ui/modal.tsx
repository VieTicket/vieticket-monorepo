"use client";

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export function Modal({ isOpen, onClose, children, title }: ModalProps) {
  const portalElRef = useRef<HTMLDivElement | null>(null);

  // create a container for portal once on client
  if (!portalElRef.current && typeof document !== "undefined") {
    portalElRef.current = document.createElement("div");
  }

  useEffect(() => {
    const el = portalElRef.current!;
    if (!el) return;
    document.body.appendChild(el);
    return () => {
      if (document.body.contains(el)) document.body.removeChild(el);
    };
  }, []);

  // Close modal on escape key & prevent body scroll when open
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !portalElRef.current) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop (lower than modal but higher than page) */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        style={{
          // ensure GPU compositing to avoid weird painting issues
          transform: "translateZ(0)",
          backfaceVisibility: "hidden",
        }}
      />

      {/* Modal */}
      <div
        className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden transform-gpu focus:outline-none focus-visible:outline-none"
        tabIndex={-1}
        style={{
          transform: "translateZ(0)",
          backfaceVisibility: "hidden",
        }}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        )}

        {/* Content */}
        <div
          className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] overscroll-contain scroll-smooth"
          style={{
            transform: "translateZ(0)",
            backfaceVisibility: "hidden",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, portalElRef.current);
}