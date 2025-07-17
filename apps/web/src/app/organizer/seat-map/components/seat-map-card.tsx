"use client";

import { Clock, PenSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type SeatMapItem = {
  id: string;
  name: string;
  updatedAt: string;
  createdAt: string;
  image?: string;
  createdBy: string;
};

interface SeatMapCardProps {
  item: SeatMapItem;
  viewMode: "grid" | "list";
  formatDate: (date: string) => string;
}

export function SeatMapCard({ item, viewMode, formatDate }: SeatMapCardProps) {
  const placeholderImage =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Cpath d='M30,30 L70,70 M30,70 L70,30' stroke='%23cccccc' stroke-width='2'/%3E%3C/svg%3E";

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
        </div>
        <div className="p-4">
          <h3 className="font-medium truncate">{item.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center mt-1">
            <Clock size={14} className="mr-1" />
            {formatDate(item.updatedAt)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden shrink-0">
        <img
          src={item.image || placeholderImage}
          alt={item.name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{item.name}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Updated {formatDate(item.updatedAt)}
        </p>
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link href={`/seat-map?id=${item.id}`}>Edit</Link>
      </Button>
    </div>
  );
}
