"use client";

import { SeatMapItem } from "../page";

interface RecentSeatMapsListProps {
  seatMaps: SeatMapItem[];
  formatDate: (date: Date) => string;
}

export function RecentSeatMapsList({
  seatMaps,
  formatDate,
}: RecentSeatMapsListProps) {
  const placeholderImage =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Cpath d='M30,30 L70,70 M30,70 L70,30' stroke='%23cccccc' stroke-width='2'/%3E%3C/svg%3E";

  return (
    <>
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-3 px-2">
        Recent Updates
      </div>
      <div className="space-y-2">
        {seatMaps.length > 0 ? (
          seatMaps.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              onClick={() => window.open(`/seat-map?id=${item.id}`, "_blank")}
            >
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden shrink-0">
                <img
                  src={item.image || placeholderImage}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium truncate">{item.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(item.updatedAt)}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-sm text-gray-500 dark:text-gray-400 px-2">
            No seat maps yet
          </div>
        )}
      </div>
    </>
  );
}
