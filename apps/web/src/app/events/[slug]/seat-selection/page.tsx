"use client";

import { useTicketData } from '@/hooks/use-ticket-data';
import { use, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrencyVND } from '@/lib/utils';
import { createOrderAction } from '@/lib/actions/customer/checkout-actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Loader2, MapPin, Users, CreditCard } from 'lucide-react';

interface SeatSelectionPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ eventId?: string }>;
}

export default function SeatSelectionPage({ searchParams }: SeatSelectionPageProps) {
  const { eventId } = use(searchParams);
  const router = useRouter();
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  const { data: ticketData, isLoading, error } = useTicketData(eventId!);

  const handleSeatClick = (seatId: string, isAvailable: boolean) => {
    if (!isAvailable) return;

    setSelectedSeats(prev => 
      prev.includes(seatId) 
        ? prev.filter(id => id !== seatId)
        : [...prev, seatId]
    );
  };

  const getSeatStatus = (seatId: string) => {
    const seatStatus = ticketData?.data?.seatStatus;
    if (!seatStatus) return 'available';
    
    if (seatStatus.paidSeatIds.includes(seatId)) return 'sold';
    if (seatStatus.activeHoldSeatIds.includes(seatId)) return 'held';
    return 'available';
  };

  const getSeatStatusColor = (status: string, isSelected: boolean) => {
    if (isSelected) return 'bg-blue-500 text-white border-blue-600';
    
    switch (status) {
      case 'sold': return 'bg-red-500 text-white cursor-not-allowed';
      case 'held': return 'bg-yellow-500 text-white cursor-not-allowed';
      case 'available': return 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200 cursor-pointer';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  const calculateTotal = () => {
    if (!ticketData?.data?.seatingStructure) return 0;
    
    let total = 0;
    for (const area of ticketData.data.seatingStructure) {
      for (const row of area.rows) {
        for (const seat of row.seats) {
          if (selectedSeats.includes(seat.id)) {
            total += area.price;
          }
        }
      }
    }
    return total;
  };

  const getSelectedSeatDetails = () => {
    if (!ticketData?.data?.seatingStructure) return [];
    
    const details: Array<{
      seatId: string;
      areaName: string;
      rowName: string;
      seatNumber: string;
      price: number;
    }> = [];

    for (const area of ticketData.data.seatingStructure) {
      for (const row of area.rows) {
        for (const seat of row.seats) {
          if (selectedSeats.includes(seat.id)) {
            details.push({
              seatId: seat.id,
              areaName: area.name,
              rowName: row.rowName,
              seatNumber: seat.seatNumber,
              price: area.price
            });
          }
        }
      }
    }
    return details;
  };

  const handleProceedToPayment = async () => {
    if (selectedSeats.length === 0) {
      toast.error('Please select at least one seat');
      return;
    }

    setIsCreatingOrder(true);
    try {
      const result = await createOrderAction(eventId!, selectedSeats);
      
      if (result.success && result.data) {
        toast.success('Order created successfully! Redirecting to payment...');
        // Redirect to VNPay payment URL
        window.location.href = result.data.vnpayURL;
      } else {
        toast.error(result.error?.message || 'Failed to create order');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading ticket information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">Error loading tickets: {error.message}</p>
            <Button onClick={() => router.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!ticketData?.data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="mb-4">No ticket data available</p>
            <Button onClick={() => router.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { eventData, seatingStructure } = ticketData.data;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Select Your Seats
        </h1>
        <div className="flex items-center gap-2 text-gray-600">
          <MapPin className="w-4 h-4" />
          <span>{eventData.name}</span>
          <span>•</span>
          <span>{eventData.location}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Seat Map */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Seating Chart
              </CardTitle>
              
              {/* Legend */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span>Selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span>On Hold</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span>Sold</span>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {seatingStructure.map((area) => (
                <div key={area.id} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{area.name}</h3>
                    <Badge variant="secondary">
                      {formatCurrencyVND(area.price)}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    {area.rows.map((row) => (
                      <div key={row.id} className="flex items-center gap-2">
                        <div className="w-12 text-sm font-medium text-gray-600 text-right">
                          {row.rowName}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {row.seats.map((seat) => {
                            const status = getSeatStatus(seat.id);
                            const isSelected = selectedSeats.includes(seat.id);
                            const isAvailable = status === 'available';
                            
                            return (
                              <button
                                key={seat.id}
                                onClick={() => handleSeatClick(seat.id, isAvailable)}
                                className={`
                                  w-8 h-8 text-xs font-medium rounded border transition-colors
                                  ${getSeatStatusColor(status, isSelected)}
                                `}
                                disabled={!isAvailable}
                                title={`Seat ${seat.seatNumber} - ${status}`}
                              >
                                {seat.seatNumber}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Order Summary
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {selectedSeats.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No seats selected
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    {getSelectedSeatDetails().map((seat) => (
                      <div key={seat.seatId} className="flex justify-between text-sm">
                        <span>
                          {seat.areaName} - {seat.rowName} - Seat {seat.seatNumber}
                        </span>
                        <span>{formatCurrencyVND(seat.price)}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between font-semibold">
                    <span>Total ({selectedSeats.length} seats)</span>
                    <span>{formatCurrencyVND(calculateTotal())}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Button
            onClick={handleProceedToPayment}
            disabled={selectedSeats.length === 0 || isCreatingOrder}
            className="w-full"
            size="lg"
          >
            {isCreatingOrder ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Creating Order...
              </>
            ) : (
              'Proceed to Payment'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}