"use client";

import { useState, useEffect, useCallback } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
  X,
  Plus,
  Check
} from "lucide-react";
import { EventFull } from "@vieticket/db/pg/schema";

interface EventCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEvent: EventFull;
  onAddToCompare: (eventIds: string[]) => void;
}

interface SearchEvent {
  id: string;
  name: string;
  location: string;
  bannerUrl?: string;
  posterUrl?: string;
  type: string;
  typicalTicketPrice: number;
  organizer?: {
    name: string;
    organizerType: string;
  };
}

interface EventComparisonData {
  id: string;
  name: string;
  price: { min: number; max: number; avg: number };
  location: string;
  organizer: { name: string; type: string };
  category: string;
}

interface ComparisonResult {
  events: EventComparisonData[];
  priceRanking: EventComparisonData[];
}

export function EventCompareModal({ 
  isOpen, 
  onClose, 
  currentEvent, 
  onAddToCompare 
}: EventCompareModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchEvent[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Search events with debounce
  const searchEvents = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch(`/api/events/search?q=${encodeURIComponent(query)}&limit=10`);
      if (!response.ok) {
        throw new Error('Failed to search events');
      }
      const data = await response.json();
      setSearchResults(data.events || []);
    } catch (err) {
      setError("Có lỗi xảy ra khi tìm kiếm sự kiện");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Handle search input with debounce
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const timeout = setTimeout(() => {
      searchEvents(value);
    }, 300);
    
    setSearchTimeout(timeout);
  };

  // Handle event selection
  const handleEventSelect = (eventId: string) => {
    const newSelected = new Set(selectedEvents);
    if (newSelected.has(eventId)) {
      newSelected.delete(eventId);
    } else {
      newSelected.add(eventId);
    }
    setSelectedEvents(newSelected);
  };

  // Handle compare selected events
  const handleCompare = async () => {
    if (selectedEvents.size === 0) {
      setError("Vui lòng chọn ít nhất một sự kiện để so sánh");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch full event details for selected events
      const selectedEventIds = Array.from(selectedEvents);
      const eventsToCompare = await Promise.all(
        selectedEventIds.map(id => fetchEventByIdFromAPI(id))
      );

      const validEvents = eventsToCompare.filter(event => event !== null) as EventFull[];
      
      if (validEvents.length === 0) {
        setError("Không tìm thấy sự kiện để so sánh");
        return;
      }

      // Perform comparison with all events including current event
      const allEvents = [currentEvent, ...validEvents];
      const result = compareMultipleEvents(allEvents);
      setComparisonResult(result);
    } catch (err) {
      setError("Có lỗi xảy ra khi so sánh sự kiện");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCompare = () => {
    if (selectedEvents.size > 0) {
      onAddToCompare(Array.from(selectedEvents));
      onClose();
    }
  };

  const resetModal = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedEvents(new Set());
    setComparisonResult(null);
    setError(null);
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      setSearchTimeout(null);
    }
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

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

  const compareMultipleEvents = (events: EventFull[]): ComparisonResult => {
    // Convert events to comparison data
    const eventData: EventComparisonData[] = events.map(event => {
      const prices = event.areas.map(area => Number(area.price));
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
      const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

      return {
        id: event.id,
        name: event.name,
        price: { min: minPrice, max: maxPrice, avg: avgPrice },
        location: event.location || "Không có thông tin",
        organizer: {
          name: event.organizer?.name || "Không có thông tin",
          type: event.organizer?.organizerType || "Không có thông tin",
        },
        category: event.type || "Không có thông tin",
      };
    });

    // Create rankings
    const priceRanking = [...eventData].sort((a, b) => a.price.avg - b.price.avg);

    return {
      events: eventData,
      priceRanking,
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

        {/* Search Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Tìm kiếm sự kiện để so sánh</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Nhập tên sự kiện..."
              className="pl-10"
            />
          </div>
          {isSearching && (
            <p className="text-sm text-gray-500">Đang tìm kiếm...</p>
          )}
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Kết quả tìm kiếm</h3>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {searchResults.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleEventSelect(event.id)}
                >
                  <Checkbox
                    checked={selectedEvents.has(event.id)}
                    onChange={() => handleEventSelect(event.id)}
                    className="flex-shrink-0"
                  />
                  <img
                    src={event.bannerUrl || event.posterUrl || "/placeholder-event.jpg"}
                    alt={event.name}
                    className="w-12 h-12 rounded object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" title={event.name}>{event.name}</p>
                    <p className="text-xs text-gray-500 truncate" title={event.location}>{event.location}</p>
                    <p className="text-xs text-gray-400" title={event.type}>{event.type}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium">
                      {formatCurrency(event.typicalTicketPrice)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Events Summary */}
        {selectedEvents.size > 0 && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                Đã chọn {selectedEvents.size} sự kiện
              </span>
              <Button
                onClick={handleCompare}
                disabled={isLoading}
                size="sm"
                className="px-3 py-1"
              >
                {isLoading ? "Đang so sánh..." : "So sánh"}
              </Button>
            </div>
          </div>
        )}

        {/* Comparison Results */}
        {comparisonResult && selectedEvents.size > 0 && (
          <div className="space-y-6">
            {/* Selected Events Info */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">Sự kiện đã chọn để so sánh</h3>
              <div className="space-y-2">
                {Array.from(selectedEvents).map((eventId) => {
                  const event = searchResults.find(e => e.id === eventId);
                  if (!event) return null;
                  return (
                    <div key={eventId} className="flex items-center space-x-2">
                      <img 
                        src={event.bannerUrl || event.posterUrl || "/placeholder-event.jpg"} 
                        alt={event.name}
                        className="w-8 h-8 rounded object-cover"
                      />
                      <div>
                        <p className="font-medium text-sm">{event.name}</p>
                        <p className="text-xs text-gray-600">{event.location}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>


            {/* Detailed Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Price Ranking */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <DollarSign className="h-5 w-5" />
                    <span>Xếp hạng giá cả</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {comparisonResult.priceRanking.map((event, index) => (
                    <div key={event.id} className="flex justify-between items-center p-2 rounded bg-gray-50">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                        <span className="text-sm font-medium truncate" title={event.name}>{event.name}</span>
                      </div>
                      <span className="text-sm font-medium">
                        {formatCurrency(event.price.avg)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Location List */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <MapPin className="h-5 w-5" />
                    <span>Địa điểm</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {comparisonResult.events.map((event) => (
                    <div key={event.id} className="flex justify-between items-center p-2 rounded bg-gray-50">
                      <span className="text-sm font-medium truncate" title={event.name}>{event.name}</span>
                      <span className="text-sm text-gray-600 truncate max-w-32" title={event.location}>
                        {event.location}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Organizer List */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <User className="h-5 w-5" />
                    <span>Nhà tổ chức</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {comparisonResult.events.map((event) => (
                    <div key={event.id} className="flex justify-between items-center p-2 rounded bg-gray-50">
                      <span className="text-sm font-medium truncate" title={event.name}>{event.name}</span>
                      <div className="text-right">
                        <p className="text-sm text-gray-600 truncate max-w-32" title={event.organizer.name}>{event.organizer.name}</p>
                        <p className="text-xs text-gray-500" title={event.organizer.type}>{event.organizer.type}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Category List */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <Tag className="h-5 w-5" />
                    <span>Thể loại</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {comparisonResult.events.map((event) => (
                    <div key={event.id} className="flex justify-between items-center p-2 rounded bg-gray-50">
                      <span className="text-sm font-medium truncate" title={event.name}>{event.name}</span>
                      <span className="text-sm text-gray-600 truncate max-w-32" title={event.category}>
                        {event.category}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleClose}>
                Đóng
              </Button>
            </div>
          </div>
        )}

        {/* No comparison results yet */}
        {!comparisonResult && searchResults.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nhập tên sự kiện để tìm kiếm và so sánh</p>
          </div>
        )}
      </div>
    </Modal>
  );
}