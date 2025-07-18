import { getUserOrdersAction } from "@/lib/actions/customer/order-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface OrdersPageProps {
  searchParams?: {
    page?: string;
    limit?: string;
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "paid":
      return "bg-green-100 text-green-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "failed":
      return "bg-red-100 text-red-800";
    case "cancelled":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-blue-100 text-blue-800";
  }
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const page = Number(searchParams?.page ?? 1);
  const limit = Number(searchParams?.limit ?? 10);

  const result = await getUserOrdersAction(page, limit);

  if (!result.success || !result.data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md text-center">
          <CardHeader>
            <CardTitle>Orders Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500 mb-4">
              {result.error || "Could not load orders."}
            </p>
            <Button asChild>
              <Link href="/">Go to Homepage</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { orders, pagination } = result.data;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Your Orders</CardTitle>
            <p className="text-sm text-gray-600">
              View all your ticket orders. Click an order to see details and tickets.
            </p>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                You have not placed any orders yet.
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {orders.map((order: any) => (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="block hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150"
                  >
                    <div className="flex items-center justify-between py-4 px-2">
                      <div>
                        <div className="font-semibold text-lg text-primary">
                          Order #{order.id.slice(-8)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Placed on{" "}
                          {new Date(order.orderDate).toLocaleDateString("vi-VN", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge className={getStatusColor(order.status)}>
                          {order.status.toUpperCase()}
                        </Badge>
                        <div className="font-bold text-primary text-base">
                          {formatCurrency(order.totalAmount)}
                        </div>
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
                href={`/orders?page=${page - 1}&limit=${limit}`}
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
                href={`/orders?page=${page + 1}&limit=${limit}`}
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