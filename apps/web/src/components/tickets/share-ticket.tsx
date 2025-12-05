"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Loader2, Download, Copy } from "lucide-react";
import { toast } from "sonner";
import * as htmlToImage from "html-to-image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { TicketDetailsView } from "@/components/tickets/ticket-details-view";
import { getTicketDetailsAction } from "@/lib/actions/customer/order-actions";

interface ShareTicketProps {
  ticketId: string;
  ticket?: {
    ticketId: string;
    status: string;
    purchasedAt: Date;
    orderId: string;
    seatNumber: string;
    rowName: string;
    areaName: string;
    eventName: string;
    startTime: string;
    qrData: string;
  };
}

export function ShareTicket({ ticketId, ticket }: ShareTicketProps) {
  const ticketSectionRef = useRef<HTMLDivElement | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [openPreview, setOpenPreview] = useState(false);
  const [localTicket, setLocalTicket] = useState<ShareTicketProps["ticket"] | null>(
    ticket ?? null
  );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const waitForImages = useCallback(async (root: HTMLElement) => {
    const imgs = Array.from(root.querySelectorAll<HTMLImageElement>("img"));
    await Promise.all(
      imgs.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0) return resolve();
            const done = () => resolve();
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
          })
      )
    );
  }, []);

  const captureTicketImage = useCallback(async () => {
    const node = ticketSectionRef.current;
    if (!node) {
      toast.error("Unable to find ticket content to share.");
      return null;
    }
    try {
      // 1. Ensure fonts are ready (prevents glitchy text)
      await document.fonts.ready;

      // 2. Wait for images inside the node
      await waitForImages(node);

      // 3. Generate image
      // We explicitly set backgroundColor white here to ensure no transparency issues
      return await htmlToImage.toPng(node, {
        cacheBust: true,
        pixelRatio: 3, // Increased for sharper text on mobile
        backgroundColor: "#ffffff",
        // Force the clone to be visible even if parent is hidden
        style: {
          opacity: "1",
          visibility: "visible",
        }
      });
    } catch (e) {
      console.error(e);
      toast.error("Failed to capture ticket image.");
      return null;
    }
  }, [waitForImages]);

  const handleShare = useCallback(async () => {
    setIsSharing(true);
    try {
      if (!localTicket) {
        setIsLoadingDetails(true);
        const result = await getTicketDetailsAction(ticketId);
        setIsLoadingDetails(false);
        if (!result.success || !result.data) {
          toast.error(result.error || "Unable to load ticket details.");
          return;
        }
        const data = result.data as any;
        const normalized: ShareTicketProps["ticket"] = {
          ticketId: data.ticketId,
          status: String(data.status),
          purchasedAt: data.purchasedAt ?? new Date(),
          orderId: data.orderId,
          seatNumber: data.seatNumber,
          rowName: data.rowName,
          areaName: data.areaName,
          eventName: data.eventName,
          startTime: typeof data.startTime === "string" ? data.startTime : new Date(data.startTime).toISOString(),
          qrData: data.qrData ?? "",
        };
        setLocalTicket(normalized);
        // Give React a moment to render the newly set data into the hidden DOM
        await new Promise((r) => setTimeout(r, 100));
      }

      const dataUrl = await captureTicketImage();
      if (!dataUrl) return;

      const supportsNavigatorShare =
        typeof navigator !== "undefined" &&
        typeof (navigator as any).share === "function";

      if (supportsNavigatorShare) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], `ticket-${ticketId}.png`, {
          type: "image/png",
        });
        const canShareFiles =
          typeof (navigator as any).canShare === "function" &&
          (navigator as any).canShare({ files: [file] });

        if (canShareFiles) {
          try {
            await (navigator as any).share({
              files: [file],
              title: "Your Ticket",
              text: "Here is your ticket for the event.",
            });
            toast.success("Shared successfully.");
            setIsSharing(false);
            return;
          } catch (err: any) {
            if (err.name !== "AbortError") {
              console.error("Share failed:", err);
            }
          }
        }
      }

      setImageDataUrl(dataUrl);
      setOpenPreview(true);
    } finally {
      setIsSharing(false);
    }
  }, [captureTicketImage, ticketId, localTicket]);

  const handleCopy = useCallback(async () => {
    if (!imageDataUrl) return;
    try {
      const res = await fetch(imageDataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ] as any);
      toast.success("Image copied to clipboard.");
    } catch {
      toast.error("Copy failed. Try downloading instead.");
    }
  }, [imageDataUrl]);

  const handleDownload = useCallback(() => {
    if (!imageDataUrl) return;
    const a = document.createElement("a");
    a.href = imageDataUrl;
    a.download = `ticket-${ticketId}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [imageDataUrl, ticketId]);

  return (
    <div className="mt-6">
      <div className="flex justify-center">
        <Button size="sm" onClick={handleShare} disabled={isSharing}>
          {isSharing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Share2 className="mr-2 h-4 w-4" />
          )}
          Share Ticket
        </Button>
      </div>

      {/* CAPTURE CONTAINER STRATEGY:
        1. Outer div is the "Hiding Mechanism": height 0, overflow hidden.
           This removes it from the user's view without stopping DOM painting.
        2. Inner div (ticketSectionRef) is the "Capture Target":
           - Width set to fixed px (mobile size) for consistent image generation.
           - Background white (important for dark mode users sharing).
           - Opacity 1 (Must be visible to the renderer).
      */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: 0,       // Collapse height
          width: 0,        // Collapse width
          overflow: "hidden", // Hide contents that spill out
          zIndex: -50,     // Push behind everything else just in case
        }}
      >
        <div
          ref={ticketSectionRef}
          className="bg-white text-black p-4" // Force light mode styles for the image
          style={{
            width: "375px", // Standard mobile width for the screenshot
            minHeight: "100px",
            position: "relative", // Needed for internal absolute positioning
          }}
        >
          {localTicket ? (
            <TicketDetailsView ticket={localTicket} hideShare />
          ) : null}
        </div>
      </div>

      <Dialog open={openPreview} onOpenChange={setOpenPreview}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ticket Screenshot</DialogTitle>
          </DialogHeader>
          {imageDataUrl ? (
            <div className="flex justify-center bg-gray-100 p-4 rounded border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageDataUrl}
                alt="Ticket screenshot"
                className="max-h-[60vh] w-auto rounded shadow-sm"
              />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No image available.
            </div>
          )}
          <DialogFooter className="flex gap-2 justify-end sm:justify-center">
            <Button variant="secondary" onClick={handleCopy} disabled={!imageDataUrl}>
              <Copy className="mr-2 h-4 w-4" /> Copy
            </Button>
            <Button onClick={handleDownload} disabled={!imageDataUrl}>
              <Download className="mr-2 h-4 w-4" /> Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
