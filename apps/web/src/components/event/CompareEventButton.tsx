"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EventCompareModal } from "./EventCompareModal";
import { EventFull } from "@vieticket/db/pg/schema";
import { Scale } from "lucide-react";

interface CompareEventButtonProps {
  event: EventFull;
  isAuthenticated: boolean;
}

export function CompareEventButton({ event, isAuthenticated }: CompareEventButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCompareClick = () => {
    if (!isAuthenticated) {
      // Redirect to login page
      window.location.href = "/auth/sign-in?redirectTo=" + encodeURIComponent(window.location.pathname);
      return;
    }
    setIsModalOpen(true);
  };

  const handleAddToCompare = (eventIds: string[]) => {
    // Here you can implement logic to add events to a comparison list
    // For now, we'll just show a success message
    alert(`Đã thêm ${eventIds.length} sự kiện vào danh sách so sánh!`);
  };

  return (
    <>
      <Button
        onClick={handleCompareClick}
        variant="outline"
        className="flex items-center space-x-2"
      >
        <Scale className="h-4 w-4" />
        <span>So sánh sự kiện</span>
      </Button>

      <EventCompareModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentEvent={event}
        onAddToCompare={handleAddToCompare}
      />
    </>
  );
}
