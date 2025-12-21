import { getOrderDetailsAction } from "@/lib/actions/customer/order-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { OrderDetails } from "@/components/orders/order-details-view";
import { RefundRequestView } from "./refund-request-view";
import { getTranslations } from "next-intl/server";

interface OrderRefundPageProps {
  params: Promise<{
    orderId: string;
  }>;
}

export default async function OrderRefundPage({ params }: OrderRefundPageProps) {
  const { orderId } = await params;
  const t = await getTranslations("refunds.requestPage");
  const result = await getOrderDetailsAction(orderId);

  if (!result.success || !result.data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md text-center">
          <CardHeader>
            <CardTitle>{t("orderNotFound.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500 mb-4">
              {result.error || t("orderNotFound.description")}
            </p>
            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link href="/orders">{t("orderNotFound.viewOrders")}</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/">{t("orderNotFound.goHome")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <RefundRequestView order={result.data as OrderDetails} />;
}
