import { getTicketDetailsAction } from "@/lib/actions/customer/order-actions";
import { TicketDetailsView } from "@/components/tickets/ticket-details-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface TicketPageProps {
  params: Promise<{
    ticketId: string;
  }>;
}

export default async function TicketPage({ params }: TicketPageProps) {
  const { ticketId } = await params;
  const result = await getTicketDetailsAction(ticketId);

  if (!result.success || !result.data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md text-center">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500 mb-4">
              {result.error || "Could not load ticket details."}
            </p>
            <Button asChild>
              <Link href="/">Go to Homepage</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <TicketDetailsView ticket={result.data as any} />;
}
