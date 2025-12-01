"use client";

import { useEffect, useState, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Rating = {
  id: string;
  eventId: string;
  userId: string;
  stars: number;
  comment: string | null;
  createdAt: Date;
  userName: string | null;
  userImage: string | null;
};

type Props = {
  eventId: string;
  initialRatings: Rating[];
};

export function EventRatingsList({ eventId, initialRatings }: Props) {
  const [ratings] = useState<Rating[]>(initialRatings);
  const [selectedStarFilter, setSelectedStarFilter] = useState<number | null>(null);

  // Filter ratings based on selected star filter
  const filteredRatings = useMemo(() => {
    if (selectedStarFilter === null) {
      return ratings;
    }
    return ratings.filter((rating) => rating.stars === selectedStarFilter);
  }, [ratings, selectedStarFilter]);

  // Count ratings by star
  const ratingCounts = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach((rating) => {
      counts[rating.stars] = (counts[rating.stars] || 0) + 1;
    });
    return counts;
  }, [ratings]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderStars = (stars: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={cn(
          "text-lg",
          i < stars ? "text-yellow-500" : "text-gray-300"
        )}
      >
        ★
      </span>
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/organizer/general/create?id=${eventId}`}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
          Đánh giá sự kiện
        </h1>
      </div>

      <Card className="rounded-xl shadow-lg">
        <CardHeader>
          <div className="flex flex-col gap-4">
            <CardTitle className="text-xl font-semibold text-gray-800 dark:text-gray-100">
              Tất cả đánh giá ({filteredRatings.length})
            </CardTitle>
            
            {/* Star Filter Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={selectedStarFilter === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStarFilter(null)}
                className="text-sm"
              >
                Tất cả ({ratings.length})
              </Button>
              {[5, 4, 3, 2, 1].map((star) => (
                <Button
                  key={star}
                  variant={selectedStarFilter === star ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStarFilter(star)}
                  className="text-sm flex items-center gap-1"
                >
                  <span className="text-yellow-500">★</span>
                  {star} sao ({ratingCounts[star] || 0})
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {ratings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">Chưa có đánh giá nào cho sự kiện này.</p>
            </div>
          ) : filteredRatings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">Không có đánh giá {selectedStarFilter} sao nào.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredRatings.map((rating) => (
                <div
                  key={rating.id}
                  className="border-b pb-6 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={rating.userImage || ""} />
                      <AvatarFallback>
                        {rating.userName?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-base">
                          {rating.userName || "Người dùng ẩn danh"}
                        </span>
                        <div className="flex items-center gap-1">
                          {renderStars(rating.stars)}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {rating.stars}.0
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mb-3">
                        {formatDate(rating.createdAt)}
                      </div>
                      {rating.comment && (
                        <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                          {rating.comment}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

