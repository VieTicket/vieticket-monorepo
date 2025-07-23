"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { generateQRCodeImage } from "@vieticket/utils/ticket-validation/client"
import { Armchair, Calendar, Clock, MapPin, Receipt, User } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"

type OrderEvent = {
    eventId: string
    eventName: string
}

type OrderTicket = {
    ticketId: string
    status: string
    seatNumber: string
    rowName: string
    areaName: string
    qrData: string
}

export type OrderDetails = {
    id: string
    orderDate: Date
    totalAmount: number
    status: string
    updatedAt: Date
    tickets: OrderTicket[]
    event: OrderEvent
}

interface OrderDetailsViewProps {
    order: OrderDetails
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(amount)
}

function getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
        case "paid":
            return "bg-green-100 text-green-800"
        case "pending":
            return "bg-yellow-100 text-yellow-800"
        case "failed":
            return "bg-red-100 text-red-800"
        case "cancelled":
            return "bg-gray-100 text-gray-800"
        default:
            return "bg-blue-100 text-blue-800"
    }
}

function TicketCard({ ticket, eventName }: { ticket: OrderTicket, eventName: string }) {
    const [qrCodeImage, setQrCodeImage] = useState<string | null>(null)
    const [isLoadingQr, setIsLoadingQr] = useState(true)
    const router = useRouter()

    useEffect(() => {
        async function createQrCode() {
            setIsLoadingQr(true)
            if (ticket.qrData) {
                const imageUrl = await generateQRCodeImage(ticket.qrData)
                setQrCodeImage(imageUrl)
            }
            setIsLoadingQr(false)
        }

        createQrCode()
    }, [ticket.qrData])

    const handleTicketClick = () => {
        router.push(`/tickets/${ticket.ticketId}`)
    }

    return (
        <div className="relative">
            {/* Ticket Container with Custom Shape */}
            <div
                className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-xl transition-shadow duration-200"
                onClick={handleTicketClick}
            >
                {/* Semicircular Cutouts at top and bottom of tear line */}
                <div
                    className="absolute top-0 left-2/3 -translate-x-1/2 w-6 h-6 bg-gray-50 dark:bg-gray-900 rounded-b-full -mt-3 border-b border-gray-200 dark:border-gray-700"></div>
                <div
                    className="absolute bottom-0 left-2/3 -translate-x-1/2 w-6 h-6 bg-gray-50 dark:bg-gray-900 rounded-t-full -mb-3 border-t border-gray-200 dark:border-gray-700"></div>

                {/* Dashed Divider Line */}
                <div
                    className="absolute left-2/3 top-3 bottom-3 border-l-2 border-dashed border-gray-300 dark:border-gray-600"></div>

                <div className="flex min-h-[160px]">
                    {/* Left Side - Event Information */}
                    <div className="flex-1 p-6 pr-8">
                        <div className="space-y-3">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight">
                                        Event Ticket #{ticket.ticketId.slice(-8)}
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{eventName}</p>
                                </div>
                                <Badge
                                    className={`${getStatusColor(ticket.status)} text-xs`}>{ticket.status.toUpperCase()}</Badge>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                                    <Calendar className="w-4 h-4" />
                                    <span>JUNE 20, 2024 | 10 AM - 5 PM</span>
                                </div>

                                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                                    <MapPin className="w-4 h-4" />
                                    <span>{ticket.areaName}</span>
                                </div>

                                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                                    <Armchair className="w-4 h-4" />
                                    <span>
                                        Row: <strong>{ticket.rowName}</strong>, Seat: <strong>{ticket.seatNumber}</strong>
                                    </span>
                                </div>
                            </div>

                            <div className="pt-2">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Type: Regular</p>
                            </div>
                        </div>
                    </div>
                    {/* Right Side - QR Code */}
                    <div className="w-1/3 p-6 pl-8 flex flex-col items-center justify-center">
                        <div className="flex flex-col items-center space-y-3">
                            {ticket.status !== "active" ? (
                                // Show inactive ticket message instead of QR code
                                <div
                                    className="w-24 h-24 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
                                    <div className="text-center">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Ticket</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{ticket.status}</p>
                                    </div>
                                </div>
                            ) : isLoadingQr ? (
                                <Skeleton className="w-24 h-24 rounded-lg" />
                            ) : qrCodeImage ? (
                                <img
                                    src={qrCodeImage}
                                    alt="Ticket QR Code"
                                    className="w-24 h-24 rounded-lg border border-gray-200 dark:border-gray-600"
                                />
                            ) : (
                                <div
                                    className="w-24 h-24 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
                                    <p className="text-xs text-red-500 text-center px-2">QR Code Error</p>
                                </div>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center font-medium">
                                {ticket.status === "active" ? "Scan at entrance" : `Status: ${ticket.status}`}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export function OrderDetailsView({ order }: OrderDetailsViewProps) {
    const orderDate = new Date(order.orderDate)
    const updatedDate = new Date(order.updatedAt)

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Order Header */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <Receipt className="w-8 h-8 text-primary" />
                                <div>
                                    <CardTitle className="text-2xl">Order #{order.id.slice(-8)}</CardTitle>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Placed on{" "}
                                        {orderDate.toLocaleDateString("vi-VN", {
                                            weekday: "long",
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                        })}
                                    </p>
                                </div>
                            </div>
                            <Badge className={getStatusColor(order.status)} variant="secondary">
                                {order.status.toUpperCase()}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <div>
                                    <p className="text-sm font-medium">Order Date</p>
                                    <p className="text-sm text-gray-600">
                                        {orderDate.toLocaleDateString("vi-VN")} at{" "}
                                        {orderDate.toLocaleTimeString("vi-VN", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4 text-gray-500" />
                                <div>
                                    <p className="text-sm font-medium">Last Updated</p>
                                    <p className="text-sm text-gray-600">
                                        {updatedDate.toLocaleDateString("vi-VN")} at{" "}
                                        {updatedDate.toLocaleTimeString("vi-VN", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <User className="w-4 h-4 text-gray-500" />
                                <div>
                                    <p className="text-sm font-medium">Total Amount</p>
                                    <p className="text-sm font-bold text-primary">{formatCurrency(order.totalAmount)}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Order Summary */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Order Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span>Number of tickets:</span>
                                <span className="font-medium">{order.tickets.length}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between text-lg font-bold">
                                <span>Total:</span>
                                <span>{formatCurrency(order.totalAmount)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tickets Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Your Tickets ({order.tickets.length})</CardTitle>
                        <p className="text-sm text-gray-600">
                            Present these QR codes at the event entrance for entry. Click on any ticket to view full
                            details.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {order.tickets.map((ticket) => (
                                <TicketCard key={ticket.ticketId} ticket={ticket} eventName={order.event.eventName} />
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Important Notes */}
                <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
                    <CardContent className="pt-6">
                        <h3 className="font-medium text-amber-800 dark:text-amber-200 mb-2">Important Notes:</h3>
                        <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                            <li>• Save this page or take screenshots of your QR codes</li>
                            <li>• Each QR code can only be used once</li>
                            <li>• Arrive early to allow time for entry scanning</li>
                            <li>• Contact support if you have any issues with your tickets</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
