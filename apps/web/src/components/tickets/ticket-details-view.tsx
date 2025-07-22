"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { generateQRCodeImage } from "@vieticket/utils/ticket-validation/client";
import { Armchair, Calendar, Clock, MapPin, Ticket as TicketIcon } from "lucide-react";

// This type should ideally be defined in a shared types file
type TicketDetails = {
    ticketId: string;
    status: string;
    purchasedAt: Date;
    orderId: string;
    seatNumber: string;
    rowName: string;
    areaName: string;
    eventName: string;
    startTime: string;
    qrData: string;
};

interface TicketDetailsViewProps {
    ticket: TicketDetails;
}

export function TicketDetailsView({ ticket }: TicketDetailsViewProps) {
    const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);

    useEffect(() => {
        async function createQrCode() {
            if (ticket.qrData) {
                const imageUrl = await generateQRCodeImage(ticket.qrData);
                setQrCodeImage(imageUrl);
            }
        }
        createQrCode();
    }, [ticket.qrData]);

    const eventDate = new Date(ticket.startTime);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <TicketIcon className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle className="text-2xl font-bold mt-2">{ticket.eventName}</CardTitle>
                    <CardDescription>Your official event ticket</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-3" />
                            <span>{eventDate.toLocaleDateString("vi-VN", {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}</span>
                        </div>
                        <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-3" />
                            <span>{eventDate.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-3" />
                            <span>{ticket.areaName}</span>
                        </div>
                        <div className="flex items-center">
                            <Armchair className="w-4 h-4 mr-3" />
                            <span>Row: <strong>{ticket.rowName}</strong>, Seat: <strong>{ticket.seatNumber}</strong></span>
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-dashed">
                        <div className="flex flex-col items-center justify-center">
                            {ticket.status !== "active" ? (
                                <div
                                    className="w-32 h-32 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
                                    <div className="text-center">
                                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Ticket</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{ticket.status}</p>
                                    </div>
                                </div>
                            ) : qrCodeImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={qrCodeImage} alt="Ticket QR Code" className="w-32 h-32 rounded-lg" />
                            ) : (
                                <div className="w-32 h-32 flex items-center justify-center bg-gray-200 rounded-lg">
                                    <p className="text-xs text-red-500">QR Error</p>
                                </div>
                            )}

                            <p className="mt-2 text-xs text-gray-500">Present this QR code at the entrance</p>
                            <p className="font-mono text-xs text-gray-400 mt-2 break-all">
                                ID: {ticket.ticketId}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
