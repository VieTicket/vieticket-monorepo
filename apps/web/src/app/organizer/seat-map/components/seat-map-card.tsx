"use client";

import {
  Clock,
  PenSquare,
  MoreVertical,
  Eye,
  Globe,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

type SeatMapItem = {
  id: string;
  name: string;
  updatedAt: string;
  createdAt: string;
  image?: string;
  createdBy: string;
  publicity?: "public" | "private";
};

interface SeatMapCardProps {
  item: SeatMapItem;
  viewMode: "grid" | "list";
  formatDate: (date: string) => string;
  showActions?: boolean;
  onPublish?: (seatMapId: string) => void;
  onDelete?: (seatMapId: string) => void;
  isPublishing?: boolean;
  isDeleting?: boolean;
}

export function SeatMapCard({
  item,
  viewMode,
  formatDate,
  showActions = false,
  onPublish,
  onDelete,
  isPublishing = false,
  isDeleting = false,
}: SeatMapCardProps) {
  const placeholderImage =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Cpath d='M30,30 L70,70 M30,70 L70,30' stroke='%23cccccc' stroke-width='2'/%3E%3C/svg%3E";

  const isCurrentlyProcessing = isPublishing || isDeleting;

  if (viewMode === "grid") {
    return (
      <div className="group rounded-xl overflow-hidden border dark:border-gray-800 transition-all hover:shadow-md dark:hover:border-gray-700">
        <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
          <img
            src={item.image || placeholderImage}
            alt={item.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/seat-map?id=${item.id}`}>
                <PenSquare size={16} className="mr-2" />
                Edit
              </Link>
            </Button>
          </div>
          {item.publicity === "public" && (
            <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
              Public
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{item.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center mt-1">
                <Clock size={14} className="mr-1" />
                {formatDate(item.updatedAt)}
              </p>
            </div>
            {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={isCurrentlyProcessing}
                  >
                    <MoreVertical size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/seat-map?id=${item.id}`}>
                      <Eye size={16} className="mr-2" />
                      Open
                    </Link>
                  </DropdownMenuItem>
                  {item.publicity !== "public" && (
                    <DropdownMenuItem
                      onClick={() => onPublish?.(item.id)}
                      disabled={isPublishing}
                    >
                      <Globe size={16} className="mr-2" />
                      {isPublishing ? "Publishing..." : "Publish"}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete?.(item.id)}
                    className="text-red-600 dark:text-red-400"
                    disabled={isDeleting}
                  >
                    <Trash2 size={16} className="mr-2" />
                    {isDeleting ? "Deleting..." : "Delete"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden shrink-0 relative">
        <img
          src={item.image || placeholderImage}
          alt={item.name}
          className="w-full h-full object-cover"
        />
        {item.publicity === "public" && (
          <div className="absolute top-1 left-1 bg-green-500 rounded-full w-3 h-3"></div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium truncate">{item.name}</h3>
          {item.publicity === "public" && (
            <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-2 py-1 rounded">
              Public
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Updated {formatDate(item.updatedAt)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/seat-map?id=${item.id}`}>Edit</Link>
        </Button>
        {showActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={isCurrentlyProcessing}
              >
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/seat-map?id=${item.id}`}>
                  <Eye size={16} className="mr-2" />
                  Open
                </Link>
              </DropdownMenuItem>
              {item.publicity !== "public" && (
                <DropdownMenuItem
                  onClick={() => onPublish?.(item.id)}
                  disabled={isPublishing}
                >
                  <Globe size={16} className="mr-2" />
                  {isPublishing ? "Publishing..." : "Publish"}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete?.(item.id)}
                className="text-red-600 dark:text-red-400"
                disabled={isDeleting}
              >
                <Trash2 size={16} className="mr-2" />
                {isDeleting ? "Deleting..." : "Delete"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
