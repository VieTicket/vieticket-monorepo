"use client";

import { useEffect } from "react";

interface ViewCounterProps {
  eventId: string;
}

export default function ViewCounter({ eventId }: ViewCounterProps) {
  useEffect(() => {
    const incrementView = async () => {
      try {
        await fetch("/api/events/increment-view", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ eventId }),
        });
      } catch (error) {
        console.error("Failed to increment view:", error);
      }
    };

    incrementView();
  }, [eventId]);

  return null; // Component này không render gì
}
