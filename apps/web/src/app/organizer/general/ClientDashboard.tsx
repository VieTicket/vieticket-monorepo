"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CalendarDays,
  LayoutDashboard,
  Ticket,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Simulate currency formatting function, replace with your own if needed
const formatCurrencyVND = (amount: number) => {
  if (typeof amount !== "number") {
    return "0";
  }
  return amount.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
};

// --- Type Definitions ---
type RevenueOverTimeItem = {
  date: string; // "YYYY-MM-DD"
  total: number;
};

type RevenueDistributionItem = {
  eventName: string;
  total: number;
};

type TopEventItem = {
  eventId: string;
  eventName: string;
  totalRevenue: number;
  ticketsSold: number;
};

type OrganizerDashboardProps = {
  revenueOverTime: RevenueOverTimeItem[];
  revenueDistribution: RevenueDistributionItem[];
  topEvents: TopEventItem[];
};
type CustomTooltipProps = {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
  }>;
  label?: string;
};

// Custom Tooltip for charts
const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col space-y-1">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {label}
            </span>
            <span className="font-bold text-muted-foreground">
              {payload[0].name}
            </span>
          </div>
          <div className="flex flex-col space-y-1 text-right">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              Revenue
            </span>
            <span className="font-bold text-foreground">
              {formatCurrencyVND(payload[0].value)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default function OrganizerDashboardModern({
  revenueOverTime,
  revenueDistribution,
  topEvents,
}: OrganizerDashboardProps) {
  const totalRevenue = revenueOverTime.reduce(
    (sum, item) => sum + (Number(item.total) || 0),
    0
  );
  const totalEvents = topEvents.length;
  const totalTicketsSold = topEvents.reduce(
    (sum, item) => sum + (Number(item.ticketsSold) || 0),
    0
  );

  useEffect(() => {
    console.log({
      totalRevenue,
      totalEvents,
      totalTicketsSold,
    });
  }, [totalRevenue, totalEvents, totalTicketsSold]);
  // Generate dynamic color array
  const generateColors = (count: number): string[] => {
    const colors: string[] = [];
    for (let i = 0; i < count; i++) {
      const hue = (i * 360) / count;
      colors.push(`hsl(${hue}, 70%, 50%)`);
    }
    return colors;
  };
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  // Filter data by date range
  const filteredRevenue = useMemo(() => {
    if (!fromDate && !toDate) return revenueOverTime;

    return revenueOverTime.filter((item) => {
      const current = new Date(item.date).getTime();
      const from = fromDate ? new Date(fromDate).getTime() : -Infinity;
      const to = toDate ? new Date(toDate).getTime() : Infinity;

      return current >= from && current <= to;
    });
  }, [revenueOverTime, fromDate, toDate]);
  const dynamicColors = generateColors(revenueDistribution.length);
  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-2 sm:p-4 md:gap-8 md:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <LayoutDashboard className="h-8 w-8 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Organizer Overview
          </h1>
        </div>

        {/* --- Main Info Cards --- */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:gap-8 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrencyVND(totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                Actual (after -20%):{" "}
                {formatCurrencyVND((totalRevenue * 80) / 100)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Events
              </CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEvents}</div>
              <p className="text-xs text-muted-foreground">
                +2 new events this month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Tickets Sold
              </CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                +{totalTicketsSold.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                +15% compared to last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Featured Event
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold truncate">
                {topEvents[0]?.eventName}
              </div>
              <p className="text-xs text-muted-foreground">
                Revenue: {formatCurrencyVND(topEvents[0]?.totalRevenue)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* --- Charts --- */}
        <div className="grid gap-4 md:gap-8 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
                <div>
                  <CardTitle>Revenue Fluctuation</CardTitle>
                  <CardDescription>Revenue over time.</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="rounded border px-2 py-1 text-sm"
                  />
                  <span className="text-muted-foreground text-sm hidden sm:inline">
                    –
                  </span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="rounded border px-2 py-1 text-sm"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="h-[250px] sm:h-[350px] w-full p-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={filteredRevenue}
                  margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: string) => {
                      const date = new Date(value);
                      return date.toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      });
                    }}
                  />

                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${Number(value) / 1000000}M`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Revenue"
                    stroke="#0ea5e9"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorTotal)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revenue Structure</CardTitle>
              <CardDescription>Revenue distribution by event.</CardDescription>
            </CardHeader>
            <CardContent className="h-[250px] sm:h-[350px] w-full p-0 flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height={200} minWidth={0}>
                <PieChart>
                  <Pie
                    data={revenueDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    innerRadius={50} // Donut effect
                    fill="#8884d8"
                    dataKey="total"
                    paddingAngle={5}
                  >
                    {revenueDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={dynamicColors[index]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs px-4 mt-2">
                {revenueDistribution.map((entry, index) => (
                  <div
                    key={`legend-${index}`}
                    className="flex items-center gap-1.5"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: dynamicColors[index] }}
                    ></span>

                    <span>{entry.eventName}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* --- Top Events Table --- */}
        <Card>
          <CardHeader>
            <CardTitle>Top Events by Revenue</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Tickets Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topEvents.map((event, index) => (
                  <TableRow key={event.eventId}>
                    <TableCell>
                      <div className="font-medium">{event.eventName}</div>
                      <div className="hidden text-sm text-muted-foreground md:inline">
                        ID: {event.eventId}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={index < 2 ? "default" : "secondary"}>
                        {index < 2 ? "Hot" : "Stable"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {event.ticketsSold.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrencyVND(event.totalRevenue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
