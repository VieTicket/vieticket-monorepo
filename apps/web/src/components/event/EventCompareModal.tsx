"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  User, 
  Tag, 
  DollarSign, 
  Calendar,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  X
} from "lucide-react";
import { EventFull } from "@vieticket/db/pg/schema";

interface EventCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEvent: EventFull;
  onAddToCompare: (eventId: string) => void;
}

interface ComparisonResult {
  priceComparison: {
    event1: { min: number; max: number; avg: number };
    event2: { min: number; max: number; avg: number };
    winner: "event1" | "event2" | "tie";
    difference: number;
  };
  locationComparison: {
    event1: string;
    event2: string;
    winner: "event1" | "event2" | "tie";
  };
  organizerComparison: {
    event1: { name: string; type: string };
    event2: { name: string; type: string };
    winner: "event1" | "event2" | "tie";
  };
  categoryComparison: {
    event1: string;
    event2: string;
    winner: "event1" | "event2" | "tie";
  };
  overallWinner: "event1" | "event2" | "tie";
}

export function EventCompareModal({ 
  isOpen, 
  onClose, 
  currentEvent, 
  onAddToCompare 
}: EventCompareModalProps) {
  const [compareEventId, setCompareEventId] = useState("");
  const [compareEvent, setCompareEvent] = useState<EventFull | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async () => {
    if (!compareEventId.trim()) {
      setError("Vui lòng nhập ID sự kiện để so sánh");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch event by ID
      const event = await fetchEventByIdFromAPI(compareEventId);
      if (!event) {
        setError("Không tìm thấy sự kiện với ID này");
        return;
      }

      setCompareEvent(event);
      
      // Perform comparison
      const result = compareEvents(currentEvent, event);
      setComparisonResult(result);
    } catch (err) {
      setError("Có lỗi xảy ra khi tải sự kiện");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCompare = () => {
    if (compareEvent) {
      onAddToCompare(compareEvent.id);
      onClose();
    }
  };

  const resetModal = () => {
    setCompareEventId("");
    setCompareEvent(null);
    setComparisonResult(null);
    setError(null);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  // Fetch event by ID using API endpoint
  const fetchEventByIdFromAPI = async (eventId: string): Promise<EventFull | null> => {
    try {
      const response = await fetch(`/api/events/${eventId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch event');
      }
      const data = await response.json();
      return data.event || null;
    } catch (error) {
      console.error("Error fetching event:", error);
      return null;
    }
  };

  const compareEvents = (event1: EventFull, event2: EventFull): ComparisonResult => {
    // Price comparison
    const event1Prices = event1.areas.map(area => Number(area.price));
    const event2Prices = event2.areas.map(area => Number(area.price));
    
    const event1Min = Math.min(...event1Prices);
    const event1Max = Math.max(...event1Prices);
    const event1Avg = event1Prices.reduce((a, b) => a + b, 0) / event1Prices.length;
    
    const event2Min = Math.min(...event2Prices);
    const event2Max = Math.max(...event2Prices);
    const event2Avg = event2Prices.reduce((a, b) => a + b, 0) / event2Prices.length;

    const priceWinner = event1Avg < event2Avg ? "event1" : event2Avg < event1Avg ? "event2" : "tie";
    const priceDifference = Math.abs(event1Avg - event2Avg);

    // Location comparison (simple string comparison for now)
    const locationWinner = event1.location && event2.location ? "tie" : 
      event1.location ? "event1" : event2.location ? "event2" : "tie";

    // Organizer comparison
    const organizerWinner = event1.organizer && event2.organizer ? "tie" : 
      event1.organizer ? "event1" : event2.organizer ? "event2" : "tie";

    // Category comparison
    const categoryWinner = event1.type && event2.type ? "tie" : 
      event1.type ? "event1" : event2.type ? "event2" : "tie";

    // Overall winner calculation
    let event1Score = 0;
    let event2Score = 0;

    if (priceWinner === "event1") event1Score++;
    else if (priceWinner === "event2") event2Score++;

    if (locationWinner === "event1") event1Score++;
    else if (locationWinner === "event2") event2Score++;

    if (organizerWinner === "event1") event1Score++;
    else if (organizerWinner === "event2") event2Score++;

    if (categoryWinner === "event1") event1Score++;
    else if (categoryWinner === "event2") event2Score++;

    const overallWinner = event1Score > event2Score ? "event1" : 
      event2Score > event1Score ? "event2" : "tie";

    return {
      priceComparison: {
        event1: { min: event1Min, max: event1Max, avg: event1Avg },
        event2: { min: event2Min, max: event2Max, avg: event2Avg },
        winner: priceWinner,
        difference: priceDifference,
      },
      locationComparison: {
        event1: event1.location || "Không có thông tin",
        event2: event2.location || "Không có thông tin",
        winner: locationWinner,
      },
      organizerComparison: {
        event1: {
          name: event1.organizer?.name || "Không có thông tin",
          type: event1.organizer?.organizerType || "Không có thông tin",
        },
        event2: {
          name: event2.organizer?.name || "Không có thông tin",
          type: event2.organizer?.organizerType || "Không có thông tin",
        },
        winner: organizerWinner,
      },
      categoryComparison: {
        event1: event1.type || "Không có thông tin",
        event2: event2.type || "Không có thông tin",
        winner: categoryWinner,
      },
      overallWinner,
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getWinnerIcon = (winner: string, eventType: string) => {
    if (winner === eventType) {
      return <Trophy className="h-4 w-4 text-yellow-500" />;
    } else if (winner === "tie") {
      return <Minus className="h-4 w-4 text-gray-500" />;
    } else {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="So sánh sự kiện">
      <div className="space-y-6">
        {/* Current Event Info */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Sự kiện hiện tại</h3>
          <div className="flex items-center space-x-2">
            <img 
              src={currentEvent.bannerUrl || currentEvent.posterUrl || "/placeholder-event.jpg"} 
              alt={currentEvent.name}
              className="w-12 h-12 rounded object-cover"
            />
            <div>
              <p className="font-medium">{currentEvent.name}</p>
              <p className="text-sm text-gray-600">ID: {currentEvent.id}</p>
            </div>
          </div>
        </div>

        {/* Event ID Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Nhập ID sự kiện để so sánh</label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={compareEventId}
              onChange={(e) => setCompareEventId(e.target.value)}
              placeholder="Nhập ID sự kiện..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button 
              onClick={handleCompare}
              disabled={isLoading}
              className="px-4 py-2"
            >
              {isLoading ? "Đang tải..." : "So sánh"}
            </Button>
          </div>
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}
        </div>

        {/* Comparison Results */}
        {comparisonResult && compareEvent && (
          <div className="space-y-6">
            {/* Compare Event Info */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">Sự kiện so sánh</h3>
              <div className="flex items-center space-x-2">
                <img 
                  src={compareEvent.bannerUrl || compareEvent.posterUrl || "/placeholder-event.jpg"} 
                  alt={compareEvent.name}
                  className="w-12 h-12 rounded object-cover"
                />
                <div>
                  <p className="font-medium">{compareEvent.name}</p>
                  <p className="text-sm text-gray-600">ID: {compareEvent.id}</p>
                </div>
              </div>
            </div>

            {/* Overall Winner */}
            <div className="text-center">
              <Badge 
                variant={comparisonResult.overallWinner === "event1" ? "default" : 
                         comparisonResult.overallWinner === "event2" ? "secondary" : "outline"}
                className="text-lg px-6 py-2"
              >
                {comparisonResult.overallWinner === "event1" ? "Sự kiện hiện tại thắng" :
                 comparisonResult.overallWinner === "event2" ? "Sự kiện so sánh thắng" :
                 "Hòa nhau"}
              </Badge>
            </div>

            {/* Detailed Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Price Comparison */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <DollarSign className="h-5 w-5" />
                    <span>Giá cả</span>
                    {getWinnerIcon(comparisonResult.priceComparison.winner, "event1")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Sự kiện hiện tại:</span>
                      <span className="text-sm">
                        {formatCurrency(comparisonResult.priceComparison.event1.avg)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Sự kiện so sánh:</span>
                      <span className="text-sm">
                        {formatCurrency(comparisonResult.priceComparison.event2.avg)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Chênh lệch: {formatCurrency(comparisonResult.priceComparison.difference)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Location Comparison */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <MapPin className="h-5 w-5" />
                    <span>Địa điểm</span>
                    {getWinnerIcon(comparisonResult.locationComparison.winner, "event1")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <span className="text-sm font-medium">Sự kiện hiện tại:</span>
                    <p className="text-sm text-gray-600">{comparisonResult.locationComparison.event1}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Sự kiện so sánh:</span>
                    <p className="text-sm text-gray-600">{comparisonResult.locationComparison.event2}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Organizer Comparison */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <User className="h-5 w-5" />
                    <span>Nhà tổ chức</span>
                    {getWinnerIcon(comparisonResult.organizerComparison.winner, "event1")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <span className="text-sm font-medium">Sự kiện hiện tại:</span>
                    <p className="text-sm text-gray-600">{comparisonResult.organizerComparison.event1.name}</p>
                    <p className="text-xs text-gray-500">{comparisonResult.organizerComparison.event1.type}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Sự kiện so sánh:</span>
                    <p className="text-sm text-gray-600">{comparisonResult.organizerComparison.event2.name}</p>
                    <p className="text-xs text-gray-500">{comparisonResult.organizerComparison.event2.type}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Category Comparison */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <Tag className="h-5 w-5" />
                    <span>Thể loại</span>
                    {getWinnerIcon(comparisonResult.categoryComparison.winner, "event1")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <span className="text-sm font-medium">Sự kiện hiện tại:</span>
                    <p className="text-sm text-gray-600">{comparisonResult.categoryComparison.event1}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Sự kiện so sánh:</span>
                    <p className="text-sm text-gray-600">{comparisonResult.categoryComparison.event2}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleClose}>
                Đóng
              </Button>
              <Button onClick={handleAddToCompare}>
                Thêm vào danh sách so sánh
              </Button>
            </div>
          </div>
        )}

        {/* No comparison results yet */}
        {!comparisonResult && (
          <div className="text-center py-8 text-gray-500">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nhập ID sự kiện để bắt đầu so sánh</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
