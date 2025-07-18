import { getAllUserTicketsAction } from "@/lib/actions/customer/order-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface TicketsPageProps {
    searchParams?: {
        page?: string;
        limit?: string;
    };
}

function getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
        case "active":
            return "bg-green-100 text-green-800";
        case "used":
            return "bg-gray-200 text-gray-700";
        case "cancelled":
            return "bg-red-100 text-red-800";
        default:
            return "bg-blue-100 text-blue-800";
    }
}

export default async function TicketsPage({ searchParams }: TicketsPageProps) {
    const page = Number(searchParams?.page ?? 1);
    const limit = Number(searchParams?.limit ?? 10);

    const result = await getAllUserTicketsAction(page, limit);

    if (!result.success || !result.data) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="max-w-md text-center">
                    <CardHeader>
                        <CardTitle>Tickets Not Found</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-red-500 mb-4">
                            {result.error || "Could not load tickets."}
                        </p>
                        <Button asChild>
                            <Link href="/">Go to Homepage</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const { tickets, pagination } = result.data;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
            <div className="max-w-4xl mx-auto space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">Your Tickets</CardTitle>
                        <p className="text-sm text-gray-600">
                            View all your tickets. Click a ticket to see its details and QR code.
                        </p>
                    </CardHeader>
                    <CardContent>
                        {tickets.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                You have not purchased any tickets yet.
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                {tickets.map((ticket: any) => (
                                    <Link
                                        key={ticket.ticketId}
                                        href={`/tickets/${ticket.ticketId}`}
                                        className="block hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150"
                                    >
                                        <div className="flex items-center justify-between py-4 px-2">
                                            <div>
                                                <div className="font-semibold text-lg text-primary">
                                                    Ticket #{ticket.ticketId.slice(-8)}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {ticket.eventName} • {ticket.areaName}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    Row: <strong>{ticket.rowName}</strong>, Seat: <strong>{ticket.seatNumber}</strong>
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {new Date(ticket.eventDate ?? ticket.startTime).toLocaleDateString("vi-VN", {
                                                        year: "numeric",
                                                        month: "long",
                                                        day: "numeric",
                                                    })}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <Badge className={getStatusColor(ticket.status)}>
                                                    {ticket.status.toUpperCase()}
                                                </Badge>
                                                <Button size="sm" variant="outline">
                                                    View
                                                </Button>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Pagination Controls */}
                {pagination.pages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-6">
                        <Button
                            asChild
                            variant="outline"
                            size="sm"
                            disabled={!pagination.hasPrev}
                        >
                            <Link
                                href={`/tickets?page=${page - 1}&limit=${limit}`}
                                aria-disabled={!pagination.hasPrev}
                            >
                                Previous
                            </Link>
                        </Button>
                        <span className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-800 text-sm font-medium">
                            Page {pagination.page} of {pagination.pages}
                        </span>
                        <Button
                            asChild
                            variant="outline"
                            size="sm"
                            disabled={!pagination.hasNext}
                        >
                            <Link
                                href={`/tickets?page=${page + 1}&limit=${limit}`}
                                aria-disabled={!pagination.hasNext}
                            >
                                Next
                            </Link>
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}