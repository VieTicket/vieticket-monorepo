import { getOrderDetailsAction } from "@/lib/actions/customer/order-actions";
import { OrderDetailsView } from "@/components/orders/order-details-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface OrderPageProps {
  params: Promise<{
    orderId: string;
  }>;
}

export default async function OrderPage({ params }: OrderPageProps) {
  const { orderId } = await params;
  const result = await getOrderDetailsAction(orderId);

  if (!result.success || !result.data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md text-center">
          <CardHeader>
            <CardTitle>Order Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500 mb-4">
              {result.error || "Could not load order details."}
            </p>
            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link href="/orders">View All Orders</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/">Go to Homepage</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <OrderDetailsView order={result.data as any} />;
}