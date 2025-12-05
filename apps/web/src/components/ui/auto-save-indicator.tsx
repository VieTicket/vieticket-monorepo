/**
 * Auto-Save Status Indicator Component
 * Shows save status to user
 */

import { CheckCircle, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

export type SaveStatus = "saved" | "saving" | "error" | "idle";

interface AutoSaveIndicatorProps {
  status: SaveStatus;
  lastSaved?: number;
  className?: string;
}

export function AutoSaveIndicator({
  status,
  lastSaved,
  className,
}: AutoSaveIndicatorProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const formatLastSaved = (timestamp: number) => {
    if (!isClient) return "Đã lưu";

    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes > 0) {
      return `${minutes} phút trước`;
    } else if (seconds > 0) {
      return `${seconds} giây trước`;
    } else {
      return "Vừa xong";
    }
  };

  const getStatusConfig = () => {
    switch (status) {
      case "saved":
        return {
          icon: CheckCircle,
          text: lastSaved ? `Đã lưu ${formatLastSaved(lastSaved)}` : "Đã lưu",
          className: "text-green-600",
        };
      case "saving":
        return {
          icon: Clock,
          text: "Đang lưu...",
          className: "text-blue-600",
        };
      case "error":
        return {
          icon: AlertCircle,
          text: "Lỗi lưu",
          className: "text-red-600",
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();

  if (!config) return null;

  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs",
        config.className,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{config.text}</span>
    </div>
  );
}
