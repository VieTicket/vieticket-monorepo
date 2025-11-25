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
import { useEffect, useMemo, useState, useCallback } from "react";
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
  BarChart,
  Bar,
} from "recharts";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("organizer-dashboard.General");

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length && label) {
      const formattedDate = new Date(label).toLocaleDateString("vi-VN", {
        day: "2-digit", 
        month: "2-digit",
        year: "2-digit",
      });
      
      return (
        <div className="rounded-lg border bg-background p-1.5 sm:p-2 shadow-lg max-w-[200px] sm:max-w-[250px] mx-auto">
          <div className="flex flex-col space-y-1 text-center">
            <span className="text-[0.65rem] sm:text-[0.70rem] uppercase text-muted-foreground">
              {formattedDate}
            </span>
            <span className="text-[0.75rem] sm:text-sm font-bold text-foreground">
              {formatCurrencyVND(payload[0].value)}
            </span>
          </div>
        </div>
      );
    }

    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="rounded-lg border bg-background p-1.5 sm:p-2 shadow-lg max-w-[200px] sm:max-w-[250px] mx-auto">
          <div className="flex flex-col space-y-1 text-center">
            <span className="text-[0.65rem] sm:text-[0.70rem] uppercase text-muted-foreground">
              {data.eventName}
            </span>
            <span className="text-[0.75rem] sm:text-sm font-bold text-foreground">
              {formatCurrencyVND(data.total)}
            </span>
            <span className="text-[0.60rem] text-muted-foreground">
              {((data.total / revenueDistribution.reduce((sum, item) => sum + item.total, 0)) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      );
    }

    return null;
  };

  useEffect(() => {
    console.log({
      totalRevenue,
      totalEvents,
      totalTicketsSold,
    });
    console.log('Revenue Distribution Data:', revenueDistribution);
    console.log('Revenue Over Time Data:', revenueOverTime);
    console.log('Top Events Data:', topEvents);
  }, [totalRevenue, totalEvents, totalTicketsSold, revenueDistribution, revenueOverTime, topEvents]);
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
  const [dateFilter, setDateFilter] = useState<string>("all");

  // Calculate date ranges based on filter selection
  const getDateRange = useCallback(
    (filter: string) => {
      const now = new Date();
      const today = now.toISOString().split("T")[0];

      switch (filter) {
        case "7days":
          const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return {
            from: last7Days.toISOString().split("T")[0],
            to: today,
          };
        case "30days":
          const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return {
            from: last30Days.toISOString().split("T")[0],
            to: today,
          };
        case "custom":
          return { from: fromDate, to: toDate };
        case "all":
        default:
          return { from: "", to: "" };
      }
    },
    [fromDate, toDate]
  );

  // Filter data by date range - memoized for performance
  const filteredRevenue = useMemo(() => {
    const { from, to } = getDateRange(dateFilter);

    if (!from && !to) return revenueOverTime;

    // Pre-calculate time values for better performance
    const fromTime = from ? new Date(from).getTime() : -Infinity;
    const toTime = to ? new Date(to).getTime() : Infinity;

    return revenueOverTime.filter((item) => {
      const current = new Date(item.date).getTime();
      return current >= fromTime && current <= toTime;
    });
  }, [revenueOverTime, dateFilter, fromDate, toDate, getDateRange]);
  const dynamicColors = generateColors(revenueDistribution.length);
  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-2 sm:p-4 md:gap-8 md:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 px-2 sm:px-0">
          <LayoutDashboard className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
            {t("organizerOverview")}
          </h1>
        </div>

        {/* --- Main Info Cards --- */}
        <div className="grid gap-3 grid-cols-1 xs:grid-cols-2 md:gap-4 lg:gap-6 xl:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-medium">
               {t("totalRevenue")}
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="text-lg sm:text-2xl font-bold">
                {formatCurrencyVND(totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("actual(-20%)")}{" "}
                {formatCurrencyVND((totalRevenue * 80) / 100)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-medium">
                {t("totalEvents")}
              </CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="text-lg sm:text-2xl font-bold">{totalEvents}</div>
              <p className="text-xs text-muted-foreground"></p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-medium">
                {t("ticketsSold")}
              </CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="text-lg sm:text-2xl font-bold">
                +{totalTicketsSold.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground"></p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-medium">
                {t("featuredEvent")}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="text-sm sm:text-lg font-bold truncate">
                {topEvents[0]?.eventName}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("revenue:")} {formatCurrencyVND(topEvents[0]?.totalRevenue)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* --- Charts --- */}
        <div className="grid gap-4 md:gap-6 grid-cols-1 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader className="px-3 sm:px-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:justify-between lg:items-center">
                <div>
                  <CardTitle className="text-sm sm:text-base">{t("revenueFluctuation")}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">{t("revenueOverTime")}</CardDescription>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="rounded border px-2 py-1 text-xs sm:text-sm bg-white w-full sm:w-auto"
                  >
                    <option value="all">{t("allTime")}</option>
                    <option value="7days">{t("last7Days")}</option>
                    <option value="30days">{t("last30Days")}</option>
                    <option value="custom">{t("custom")}</option>
                  </select>

                  {dateFilter === "custom" && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="rounded border px-2 py-1 text-xs sm:text-sm w-full sm:w-auto"
                        placeholder="From"
                      />
                      <span className="text-muted-foreground text-sm hidden sm:inline">
                        –
                      </span>
                      <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="rounded border px-2 py-1 text-xs sm:text-sm w-full sm:w-auto"
                        placeholder="To"
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="h-[200px] sm:h-[250px] lg:h-[300px] w-full p-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={filteredRevenue}
                  margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
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
                    fontSize={9}
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
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${Number(value) / 1000000}M`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="total"
                    name="Revenue"
                    fill="url(#colorTotal)"
                    radius={[10, 10, 0, 0]} // Bo tròn 2 góc trên
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="px-3 sm:px-6">
              <CardTitle className="text-sm sm:text-base">{t("revenueStructure")}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">{t("revenueDistributionByEvent")}</CardDescription>
            </CardHeader>
            <CardContent className="h-[250px] sm:h-[350px] w-full p-0 flex flex-col items-center justify-center">
              {revenueDistribution && revenueDistribution.length > 0 ? (
                <>
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
                      <Tooltip content={<CustomPieTooltip />} />
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
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="text-muted-foreground text-sm">
                    {t("noRevenueData")}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {t("dataWillAppearHere")}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* --- Top Events Table --- */}
        <Card>
          <CardHeader className="px-3 sm:px-6">
            <CardTitle className="text-sm sm:text-base">{t("topEventsByRevenue")}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto px-3 sm:px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">{t("event")}</TableHead>
                  <TableHead className="text-center text-xs sm:text-sm">{t("status")}</TableHead>
                  <TableHead className="text-center text-xs sm:text-sm hidden sm:table-cell">{t("ticketsSold")}</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm">{t("revenue")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topEvents.map((event, index) => (
                  <TableRow key={event.eventId}>
                    <TableCell className="py-2 sm:py-3">
                      <div className="font-medium text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none" title={event.eventName}>
                        {event.eventName}
                      </div>
                      <div className="hidden text-xs text-muted-foreground lg:block">
                        ID: {event.eventId}
                      </div>
                      <div className="text-xs text-muted-foreground sm:hidden">
                        {event.ticketsSold.toLocaleString()} tickets
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-2 sm:py-3">
                      <Badge variant={index < 2 ? "default" : "secondary"} className="text-xs">
                        {index < 2 ? "Hot" : "Stable"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center hidden sm:table-cell py-2 sm:py-3 text-sm">
                      {event.ticketsSold.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-semibold py-2 sm:py-3 text-xs sm:text-sm">
                      <div className="truncate">
                        {formatCurrencyVND(event.totalRevenue)}
                      </div>
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
