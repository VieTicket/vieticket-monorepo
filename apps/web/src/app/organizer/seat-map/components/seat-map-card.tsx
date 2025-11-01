"use client";

import {
  Clock,
  PenSquare,
  MoreVertical,
  Eye,
  Globe,
  Trash2,
  Palette,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
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
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Cg transform='translate(50,50)'%3E%3Ccircle cx='-20' cy='-20' r='8' fill='%23007bff'/%3E%3Ccircle cx='0' cy='-20' r='8' fill='%23007bff'/%3E%3Ccircle cx='20' cy='-20' r='8' fill='%23007bff'/%3E%3Ccircle cx='-20' cy='0' r='8' fill='%23007bff'/%3E%3Ccircle cx='0' cy='0' r='8' fill='%2328a745'/%3E%3Ccircle cx='20' cy='0' r='8' fill='%23007bff'/%3E%3Ccircle cx='-20' cy='20' r='8' fill='%23007bff'/%3E%3Ccircle cx='0' cy='20' r='8' fill='%23007bff'/%3E%3Ccircle cx='20' cy='20' r='8' fill='%23007bff'/%3E%3C/g%3E%3C/svg%3E";

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
              <Link href={`/seat-map?seatMapId=${item.id}`}>
                <Palette size={16} className="mr-2" />
                Edit Canvas
              </Link>
            </Button>
          </div>

          {/* Canvas Badge */}
          <div className="absolute top-2 left-2">
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
            >
              <Layers size={12} className="mr-1" />
              Canvas
            </Badge>
          </div>

          {item.publicity === "public" && (
            <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
              Public
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{item.name}</h3>
              <div className="flex items-center mt-1 gap-2">
                <Clock size={14} className="text-gray-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(item.updatedAt)}
                </span>
              </div>
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
                    <Link href={`/seat-map?seatMapId=${item.id}`}>
                      <Palette size={16} className="mr-2" />
                      Open in Canvas Editor
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/seat-map?seatMapId=${item.id}&preview=true`}
                      target="_blank"
                    >
                      <Eye size={16} className="mr-2" />
                      Preview
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
        <div className="absolute top-1 left-1">
          <Badge
            variant="secondary"
            className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
          >
            <Layers size={8} className="mr-1" />
          </Badge>
        </div>
        {item.publicity === "public" && (
          <div className="absolute bottom-1 right-1 bg-green-500 rounded-full w-3 h-3"></div>
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
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Canvas • Updated {formatDate(item.updatedAt)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/seat-map?seatMapId=${item.id}`}>
            <Palette size={14} className="mr-1" />
            Edit
          </Link>
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
                <Link href={`/seat-map?seatMapId=${item.id}`}>
                  <Palette size={16} className="mr-2" />
                  Open in Canvas Editor
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={`/seat-map?seatMapId=${item.id}&preview=true`}
                  target="_blank"
                >
                  <Eye size={16} className="mr-2" />
                  Preview
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
