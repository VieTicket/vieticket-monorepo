"use client"

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPayoutRequestAction, getEventRevenueAction } from "@/lib/actions/organizer/payout-request-actions";
import { APIResponse } from "@/types";
import { PayoutRequestFormSchema } from "@/lib/validations/payout-request";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { calculateNetPayoutAmount } from "@vieticket/utils/finance/payouts";
import { formatCurrencyVND } from "@vieticket/utils/formatters/currency";

interface PayoutRequestFormProps {
  events: Array<{ id: string; name: string; hasActivePayoutRequest?: boolean }>;
}

export function PayoutRequestForm({ events }: PayoutRequestFormProps) {
  const router = useRouter();
  const t = useTranslations("organizer-dashboard.NewPayoutRequest");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revenue, setRevenue] = useState<number | null>(null);
  const [isLoadingRevenue, setIsLoadingRevenue] = useState(false);

  const form = useForm<z.infer<typeof PayoutRequestFormSchema>>({
    resolver: zodResolver(PayoutRequestFormSchema),
    defaultValues: {
      eventId: "",
      amount: "",
    },
  });
  const eventId = form.watch("eventId");
  const watchedAmount = form.watch("amount");

  const deductionPercent =
    revenue !== null &&
    watchedAmount !== "" &&
    Number.isFinite(Number(watchedAmount))
      ? Math.max(
          0,
          Math.min(
            100,
            ((revenue - Number(watchedAmount)) / revenue) * 100
          )
        )
      : null;

  // Fetch revenue when event selection changes
  useEffect(() => {
    if (eventId) {
      setIsLoadingRevenue(true);
      getEventRevenueAction(eventId)
        .then(result => {
          if (result.success) {
            const grossRevenue = result.data!.revenue;
            setRevenue(grossRevenue);
            const suggestedAmount = calculateNetPayoutAmount(grossRevenue);
            form.setValue("amount", suggestedAmount.toString());
          } else {
            toast.error(t("failedLoadRevenue"), {
              description: result.message || t("pleaseTryAgain"),
            });
            setRevenue(null);
            form.setValue("amount", "");
          }
        })
        .catch(() => {
          toast.error(t("error"), {
            description: t("unexpectedErrorRevenue"),
          });
          setRevenue(null);
          form.setValue("amount", "");
        })
        .finally(() => setIsLoadingRevenue(false));
    } else {
      setRevenue(null);
      form.setValue("amount", "");
    }
  }, [eventId, form, t]);

  async function onSubmit(values: z.infer<typeof PayoutRequestFormSchema>) {
    setIsSubmitting(true);
    if (revenue !== null && Number(values.amount) > revenue) {
      toast.error(t("amountExceedsRevenue"), {
        description: t("amountExceedsRevenueDesc")
      });
      setIsSubmitting(false);
      return;
    }
    try {
      const result: APIResponse<{ id: string }> = await createPayoutRequestAction(values);
      if (result.success) {
        toast.success(t("requestSubmitted"), {
          description: t("requestSubmittedDesc"),
        });
        router.push("/organizer/payouts");
      } else {
        toast.error(t("submissionFailed"), {
          description: result.message || t("pleaseTryAgain"),
        });
      }
    } catch (error) {
      toast.error(t("error"), {
        description: t("unexpectedError"),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="eventId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("event")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectEvent")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormItem>
          <FormLabel>{t("currentRevenue")}</FormLabel>
          <FormControl>
            <Input
              readOnly
              value={
                isLoadingRevenue
                  ? t("loadingRevenue")
                  : revenue !== null
                    ? formatCurrencyVND(revenue)
                    : t("selectEventToSeeRevenue")
              }
            />
          </FormControl>
        </FormItem>

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("requestedAmount")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder={t("enterAmount")}
                  {...field}
                />
              </FormControl>
              {field.value && (
                <p className="text-xs text-muted-foreground">
                  {formatCurrencyVND(Number(field.value))}
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormItem>
          <FormLabel>Deduction (%)</FormLabel>
          <FormControl>
            <Input
              readOnly
              value={
                deductionPercent !== null
                  ? `${deductionPercent.toFixed(2)}%`
                  : t("selectEventToSeeRevenue")
              }
            />
          </FormControl>
        </FormItem>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/organizer/payouts")}
          >
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("submitting") : t("submitRequest")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
