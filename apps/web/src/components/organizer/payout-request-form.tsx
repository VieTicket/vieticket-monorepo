"use client"

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
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

interface PayoutRequestFormProps {
  events: Array<{ id: string; name: string; hasActivePayoutRequest?: boolean }>;
}

export function PayoutRequestForm({ events }: PayoutRequestFormProps) {
  const router = useRouter();
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

  // Fetch revenue when event selection changes
  useEffect(() => {
    const eventId = form.watch("eventId");
    if (eventId) {
      setIsLoadingRevenue(true);
      getEventRevenueAction(eventId)
        .then(result => {
          if (result.success) {
            setRevenue(result.data!.revenue);
          } else {
            toast.error("Failed to load revenue", {
              description: result.message || "Please try again",
            });
            setRevenue(null);
          }
        })
        .catch(() => {
          toast.error("Error", {
            description: "An unexpected error occurred while loading revenue",
          });
          setRevenue(null);
        })
        .finally(() => setIsLoadingRevenue(false));
    } else {
      setRevenue(null);
    }
  }, [form.watch("eventId")]);

  async function onSubmit(values: z.infer<typeof PayoutRequestFormSchema>) {
    setIsSubmitting(true);
    if (revenue !== null && Number(values.amount) > revenue) {
      toast.error("Requested amount exceeds current event revenue", {
        description: "The requested payout amount cannot be greater than the event's generated revenue."
      });
      setIsSubmitting(false);
      return;
    }
    try {
      const result: APIResponse<{ id: string }> = await createPayoutRequestAction(values);
      if (result.success) {
        toast.success("Request Submitted", {
          description: "Your payout request has been submitted successfully",
        });
        router.push("/organizer/payouts");
      } else {
        toast.error("Submission Failed", {
          description: result.message || "Please try again",
        });
      }
    } catch (error) {
      toast.error("Error", {
        description: "An unexpected error occurred",
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
              <FormLabel>Event</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an event" />
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
          <FormLabel>Current Revenue (VND)</FormLabel>
          <FormControl>
            <Input
              readOnly
              value={
                isLoadingRevenue
                  ? "Loading revenue..."
                  : revenue !== null
                    ? revenue.toLocaleString('vi-VN')
                    : "Select an event to see revenue"
              }
            />
          </FormControl>
        </FormItem>

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Requested Amount (VND)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/organizer/payouts")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Request"}
          </Button>
        </div>
      </form>
    </Form>
  );
}