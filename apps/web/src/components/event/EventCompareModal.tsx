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
  Check,
  Film,
  Navigation,
  Loader2
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

interface LocationCoordinates {
  lat: number;
  lng: number;
}

interface EventComparisonData {
  id: string;
  name: string;
  price: { min: number; max: number; avg: number };
  location: string;
  locationCoordinates?: LocationCoordinates;
  distanceFromUser?: number; // in kilometers
  organizer: { 
    id: string;
    name: string; 
    type: string;
    rating?: { average: number; count: number };
  };
  category: string;
  showings: {
    total: number;
    active: number;
    earliestStartTime: Date | null;
    latestEndTime: Date | null;
  };
}

interface ComparisonResult {
  events: EventComparisonData[];
  priceRanking: EventComparisonData[];
  organizerRanking: EventComparisonData[];
  showingRanking: EventComparisonData[];
  distanceRanking: EventComparisonData[];
}

// Utility functions for location and distance
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

const geocodeAddress = async (address: string): Promise<LocationCoordinates | null> => {
  if (!address) return null;
  
  try {
    // Use OpenStreetMap Nominatim API (free, no API key required)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          'User-Agent': 'VieTicket/1.0' // Required by Nominatim
        }
      }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
    return null;
  } catch (error) {
    console.error("Error geocoding address:", error);
    return null;
  }
};

const getUserLocation = (): Promise<LocationCoordinates> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
};

export function EventCompareModal({ 
  isOpen, 
  onClose, 
  currentEvent, 
  onAddToCompare 
}: EventCompareModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchEvent[]>([]);
  const [suggestedEvents, setSuggestedEvents] = useState<SearchEvent[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [userLocation, setUserLocation] = useState<LocationCoordinates | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);

  // Load suggested events when modal opens and search query is empty
  const loadSuggestedEvents = useCallback(async () => {
    setIsLoadingSuggestions(true);
    setError(null);

    try {
      const response = await fetch(`/api/events?limit=10&page=1`);
      if (!response.ok) {
        throw new Error('Failed to load suggested events');
      }
      const data = await response.json();
      
      // Transform events to match SearchEvent interface and exclude current event
      const events: SearchEvent[] = (data.events || [])
        .filter((event: any) => event.id !== currentEvent.id) // Exclude current event
        .map((event: any) => ({
          id: event.id,
          name: event.name,
          location: event.location || "",
          bannerUrl: event.bannerUrl,
          posterUrl: event.posterUrl,
          type: event.type || "",
          typicalTicketPrice: event.typicalTicketPrice || 0,
          organizer: event.organizer ? {
            name: event.organizer.name || "",
            organizerType: event.organizer.organizerType || ""
          } : undefined,
        }));
      
      setSuggestedEvents(events);
    } catch (err) {
      console.error("Error loading suggested events:", err);
      setSuggestedEvents([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [currentEvent.id]);

  // Search events with debounce
  const searchEvents = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      // Load suggested events when search query is cleared
      loadSuggestedEvents();
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
      // Filter out current event from search results
      const filteredEvents = (data.events || []).filter((event: SearchEvent) => event.id !== currentEvent.id);
      setSearchResults(filteredEvents);
    } catch (err) {
      setError("Có lỗi xảy ra khi tìm kiếm sự kiện");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [loadSuggestedEvents, currentEvent.id]);

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
      const result = await compareMultipleEvents(allEvents);
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

  // Load suggested events when modal opens
  useEffect(() => {
    if (isOpen && !searchQuery.trim()) {
      loadSuggestedEvents();
    }
  }, [isOpen, loadSuggestedEvents, searchQuery]);

  // Request user location when modal opens (optional)
  useEffect(() => {
    if (isOpen && !userLocation && !locationPermissionDenied) {
      // Don't auto-request, let user click button instead
      // This respects user privacy better
    }
  }, [isOpen, userLocation, locationPermissionDenied]);

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

  // Fetch organizer rating
  const fetchOrganizerRating = async (organizerId: string): Promise<{ average: number; count: number }> => {
    try {
      const response = await fetch(`/api/organizers/${organizerId}/rating`);
      if (!response.ok) {
        return { average: 0, count: 0 };
      }
      const data = await response.json();
      return data.rating || { average: 0, count: 0 };
    } catch (error) {
      console.error("Error fetching organizer rating:", error);
      return { average: 0, count: 0 };
    }
  };

  // Get user location
  const handleGetUserLocation = async () => {
    setIsGettingLocation(true);
    setLocationPermissionDenied(false);
    setError(null);
    
    try {
      const location = await getUserLocation();
      setUserLocation(location);
      
      // Auto re-compare if there are selected events and comparison result exists
      if (selectedEvents.size > 0 && comparisonResult) {
        // Trigger re-comparison with new location
        setTimeout(() => {
          handleCompare();
        }, 500);
      }
    } catch (error: any) {
      console.error("Error getting user location:", error);
      if (error.code === 1) {
        setLocationPermissionDenied(true);
        setError("Quyền truy cập vị trí bị từ chối. Vui lòng cho phép truy cập vị trí để tính khoảng cách.");
      } else {
        setError("Không thể lấy vị trí của bạn. Vui lòng thử lại.");
      }
    } finally {
      setIsGettingLocation(false);
    }
  };

  const compareMultipleEvents = async (events: EventFull[]): Promise<ComparisonResult> => {
    // Convert events to comparison data and fetch organizer ratings
    const eventDataPromises = events.map(async (event) => {
      const prices = event.areas.map(area => Number(area.price));
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
      const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

      // Fetch organizer rating if organizer exists
      let organizerRating = { average: 0, count: 0 };
      if (event.organizer?.id) {
        organizerRating = await fetchOrganizerRating(event.organizer.id);
      }

      // Calculate showing information
      const showings = event.showings || [];
      const activeShowings = showings.filter(s => s?.isActive !== false);
      
      // Get valid start times
      const startTimes = showings
        .map(s => s?.startTime ? new Date(s.startTime).getTime() : null)
        .filter((time): time is number => time !== null && !isNaN(time));
      
      // Get valid end times
      const endTimes = showings
        .map(s => s?.endTime ? new Date(s.endTime).getTime() : null)
        .filter((time): time is number => time !== null && !isNaN(time));
      
      const earliestStartTime = startTimes.length > 0 ? new Date(Math.min(...startTimes)) : null;
      const latestEndTime = endTimes.length > 0 ? new Date(Math.max(...endTimes)) : null;

      // Geocode event location
      const locationCoordinates = await geocodeAddress(event.location || "");
      
      // Calculate distance from user location if available
      let distanceFromUser: number | undefined;
      if (userLocation && locationCoordinates) {
        distanceFromUser = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          locationCoordinates.lat,
          locationCoordinates.lng
        );
      }

      return {
        id: event.id,
        name: event.name,
        price: { min: minPrice, max: maxPrice, avg: avgPrice },
        location: event.location || "Không có thông tin",
        locationCoordinates: locationCoordinates || undefined,
        distanceFromUser,
        organizer: {
          id: event.organizer?.id || "",
          name: event.organizer?.name || "Không có thông tin",
          type: event.organizer?.organizerType || "Không có thông tin",
          rating: organizerRating,
        },
        category: event.type || "Không có thông tin",
        showings: {
          total: showings.length,
          active: activeShowings.length,
          earliestStartTime,
          latestEndTime,
        },
      };
    });

    const eventData = await Promise.all(eventDataPromises);

    // Create rankings
    const priceRanking = [...eventData].sort((a, b) => a.price.avg - b.price.avg);
    const organizerRanking = [...eventData].sort((a, b) => {
      const aRating = a.organizer.rating?.average || 0;
      const bRating = b.organizer.rating?.average || 0;
      return bRating - aRating; // Higher rating first
    });
    const showingRanking = [...eventData].sort((a, b) => {
      // Sort by total number of showings (descending), then by active showings
      if (b.showings.total !== a.showings.total) {
        return b.showings.total - a.showings.total;
      }
      return b.showings.active - a.showings.active;
    });
    const distanceRanking = [...eventData].sort((a, b) => {
      // Sort by distance (ascending - closest first)
      const aDistance = a.distanceFromUser ?? Infinity;
      const bDistance = b.distanceFromUser ?? Infinity;
      return aDistance - bDistance;
    });

    return {
      events: eventData,
      priceRanking,
      organizerRanking,
      showingRanking,
      distanceRanking,
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

  const formatDate = (date: Date | null) => {
    if (!date) return "Không có";
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const formatDistance = (distance: number | undefined) => {
    if (distance === undefined || distance === null) return "Không có";
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
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
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Tìm kiếm sự kiện để so sánh</label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGetUserLocation}
              disabled={isGettingLocation || !!userLocation}
              className="text-xs"
            >
              {isGettingLocation ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Đang lấy vị trí...
                </>
              ) : userLocation ? (
                <>
                  <Navigation className="h-3 w-3 mr-1" />
                  Đã có vị trí
                </>
              ) : (
                <>
                  <Navigation className="h-3 w-3 mr-1" />
                  Lấy vị trí
                </>
              )}
            </Button>
          </div>
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
          {userLocation && (
            <p className="text-xs text-green-600 flex items-center">
              <Navigation className="h-3 w-3 mr-1" />
              Đã lấy vị trí của bạn. Khoảng cách sẽ được tính khi so sánh.
            </p>
          )}
          {locationPermissionDenied && (
            <p className="text-xs text-amber-600">
              Quyền truy cập vị trí bị từ chối. Không thể tính khoảng cách.
            </p>
          )}
          {isSearching && (
            <p className="text-sm text-gray-500">Đang tìm kiếm...</p>
          )}
          {isLoadingSuggestions && !searchQuery.trim() && (
            <p className="text-sm text-gray-500">Đang tải sự kiện gợi ý...</p>
          )}
          {error && !locationPermissionDenied && (
            <p className="text-red-500 text-sm">{error}</p>
          )}
        </div>

        {/* Search Results or Suggested Events */}
        {(searchQuery.trim() ? searchResults.length > 0 : suggestedEvents.length > 0) && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">
              {searchQuery.trim() ? "Kết quả tìm kiếm" : "Sự kiện gợi ý"}
            </h3>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {(searchQuery.trim() ? searchResults : suggestedEvents).map((event) => (
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
                  const event = searchResults.find(e => e.id === eventId) || suggestedEvents.find(e => e.id === eventId);
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

              {/* Location List with Distance Ranking */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <MapPin className="h-5 w-5" />
                    <span>Địa điểm</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(userLocation && comparisonResult.distanceRanking.some(e => e.distanceFromUser !== undefined)
                    ? comparisonResult.distanceRanking.map((event, index) => {
                        // Find original event data to ensure we show all events
                        const hasDistance = event.distanceFromUser !== undefined;
                        const rankIndex = hasDistance ? index + 1 : null;
                        
                        return (
                          <div key={event.id} className="flex justify-between items-center p-2 rounded bg-gray-50">
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              {rankIndex && (
                                <span className="text-sm font-bold text-blue-600 flex-shrink-0">#{rankIndex}</span>
                              )}
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium truncate block" title={event.name}>{event.name}</span>
                                <span className="text-xs text-gray-500 truncate block" title={event.location}>
                                  {event.location}
                                </span>
                              </div>
                            </div>
                            {hasDistance && (
                              <div className="text-right ml-2 flex-shrink-0">
                                <span className="text-sm font-medium text-blue-600">
                                  {formatDistance(event.distanceFromUser)}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    : comparisonResult.events.map((event) => (
                        <div key={event.id} className="flex justify-between items-center p-2 rounded bg-gray-50">
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium truncate block" title={event.name}>{event.name}</span>
                            <span className="text-xs text-gray-500 truncate block" title={event.location}>
                              {event.location}
                            </span>
                          </div>
                          {event.distanceFromUser !== undefined && (
                            <div className="text-right ml-2 flex-shrink-0">
                              <span className="text-sm font-medium text-blue-600">
                                {formatDistance(event.distanceFromUser)}
                              </span>
                            </div>
                          )}
                        </div>
                      ))
                  )}
                </CardContent>
              </Card>

              {/* Organizer Ranking */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <Trophy className="h-5 w-5" />
                    <span>Xếp hạng nhà tổ chức</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {comparisonResult.organizerRanking.map((event, index) => (
                    <div key={event.id} className="flex justify-between items-center p-2 rounded bg-gray-50">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                        <div>
                          <p className="text-sm font-medium truncate" title={event.organizer.name}>{event.organizer.name}</p>
                          <p className="text-xs text-gray-500 truncate" title={event.name}>{event.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {event.organizer.rating && event.organizer.rating.average > 0 ? (
                          <div className="flex items-center space-x-1">
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 5 }, (_, i) => (
                                <span
                                  key={i}
                                  className={`text-sm ${
                                    i < Math.round(event.organizer.rating!.average) ? "text-yellow-500" : "text-gray-300"
                                  }`}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                            <div className="text-xs text-gray-600">
                              {event.organizer.rating.average.toFixed(1)} ({event.organizer.rating.count})
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">Chưa có đánh giá</div>
                        )}
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

            {/* Showing Comparison Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <Film className="h-5 w-5" />
                <span>So sánh xuất chiếu</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Showing Ranking */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center space-x-2 text-lg">
                      <Film className="h-5 w-5" />
                      <span>Xếp hạng số lượng xuất chiếu</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {comparisonResult.showingRanking.map((event, index) => (
                      <div key={event.id} className="flex justify-between items-center p-2 rounded bg-gray-50">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                          <div>
                            <p className="text-sm font-medium truncate" title={event.name}>{event.name}</p>
                            <p className="text-xs text-gray-500">
                              {event.showings.active} / {event.showings.total} xuất chiếu
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium">
                            {event.showings.total} xuất
                          </span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Showing Details */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center space-x-2 text-lg">
                      <Calendar className="h-5 w-5" />
                      <span>Chi tiết xuất chiếu</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {comparisonResult.events.map((event) => (
                      <div key={event.id} className="p-3 rounded bg-gray-50 space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="text-sm font-medium truncate flex-1" title={event.name}>
                            {event.name}
                          </span>
                        </div>
                        <div className="space-y-1 text-xs text-gray-600">
                          <div className="flex justify-between">
                            <span>Tổng số xuất:</span>
                            <span className="font-medium">{event.showings.total}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Xuất đang hoạt động:</span>
                            <span className="font-medium text-green-600">{event.showings.active}</span>
                          </div>
                          {event.showings.earliestStartTime && (
                            <div className="flex justify-between">
                              <span>Xuất sớm nhất:</span>
                              <span className="font-medium">{formatDate(event.showings.earliestStartTime)}</span>
                            </div>
                          )}
                          {event.showings.latestEndTime && (
                            <div className="flex justify-between">
                              <span>Xuất muộn nhất:</span>
                              <span className="font-medium">{formatDate(event.showings.latestEndTime)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
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
        {!comparisonResult && 
         !isLoadingSuggestions && 
         searchResults.length === 0 && 
         suggestedEvents.length === 0 && 
         !searchQuery.trim() && (
          <div className="text-center py-8 text-gray-500">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nhập tên sự kiện để tìm kiếm và so sánh</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
