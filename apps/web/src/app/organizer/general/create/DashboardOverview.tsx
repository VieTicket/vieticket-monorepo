"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Wallet, Ticket, DollarSign, BarChart } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useMemo, useState, useEffect } from "react";
import { OrderStatus } from "@vieticket/db/pg/schema";

// More detailed data types
type RevenueOverTimeItem = { date: string; total: number };

type TicketTypeRevenue = {
  ticketType: string;
  revenue: number; // Revenue from this ticket type
  ticketsSold: number; // Number of tickets sold for this type
};

type RecentTransaction = {
  id: string;
  date: string;
  ticketType: string;
  amount: number;
  status: OrderStatus;
};

type Props = {
  revenueOverTime: RevenueOverTimeItem[];
  ticketTypeRevenue: TicketTypeRevenue[];
  totalAvailableTickets: number; // Total available tickets for the event
  recentTransactions: RecentTransaction[];
};
type AreaTooltipProps = {
  active?: boolean;
  payload?: Array<{
    color: string;
    name: string;
    value: number;
  }>;
  label?: string;
};

type PieTooltipProps = {
  active?: boolean;
  payload?: Array<{
    payload: TicketTypeRevenue;
  }>;
};

// Format VND currency
const formatCurrencyVND = (amount: number) =>
  typeof amount !== "number"
    ? "0 VND"
    : amount.toLocaleString("vi-VN", { style: "currency", currency: "VND" });

// Format large numbers
const formatLargeNumber = (value: number) => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
};

// Custom tooltip for AreaChart
const CustomAreaTooltip = ({ active, payload, label }: AreaTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-md border bg-white p-2 shadow-sm">
        <p className="text-sm font-bold">
          {label ? new Date(label).toLocaleDateString("vi-VN") : ""}
        </p>
        {payload.map(
          (
            entry: { color: string; name: string; value: number },
            index: number
          ) => (
            <p
              key={`item-${index}`}
              className="text-sm"
              style={{ color: entry.color }}
            >
              {`${entry.name}: ${formatCurrencyVND(entry.value)}`}
            </p>
          )
        )}
      </div>
    );
  }
  return null;
};

// Custom tooltip for PieChart
const CustomPieTooltip = ({ active, payload }: PieTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-md border bg-white p-2 shadow-sm">
        <p className="text-sm font-bold">{data.ticketType}</p>
        <p className="text-sm text-blue-600">
          Revenue: {formatCurrencyVND(data.revenue)}
        </p>
        <p className="text-sm text-green-600">
          Tickets sold: {data.ticketsSold.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

export function DashboardOverview({
  revenueOverTime: initialRevenueOverTime,
  ticketTypeRevenue: initialTicketTypeRevenue,
  totalAvailableTickets: initialTotalAvailableTickets,
  recentTransactions: initialRecentTransactions,
}: Props) {
  // --- MOCK DATA ---
  // If no props are passed, use mock data for demonstration
  const revenueOverTime = initialRevenueOverTime;

  const ticketTypeRevenue = initialTicketTypeRevenue;
  console.log(ticketTypeRevenue);

  const totalAvailableTickets = initialTotalAvailableTickets || 1500; // Total available tickets for the event

  const recentTransactions = initialRecentTransactions;
  // --- END MOCK DATA ---

  // Calculate overview metrics
  const totalRevenue = useMemo(() => {
    return revenueOverTime.reduce((sum, item) => sum + item.total, 0);
  }, [revenueOverTime]);

  const totalTicketsSold = useMemo(() => {
    return ticketTypeRevenue.reduce((sum, item) => sum + item.ticketsSold, 0);
  }, [ticketTypeRevenue]);

  const averageTicketPrice = useMemo(() => {
    return totalTicketsSold > 0 ? totalRevenue / totalTicketsSold : 0;
  }, [totalRevenue, totalTicketsSold]);

  const ticketSoldPercentage = useMemo(() => {
    return totalAvailableTickets > 0
      ? (totalTicketsSold / totalAvailableTickets) * 100
      : 0;
  }, [totalTicketsSold, totalAvailableTickets]);

  // State for time filter
  const [dateFilter, setDateFilter] = useState<
    "all" | "7days" | "30days" | "custom"
  >("all");
  const [customFromDate, setCustomFromDate] = useState<string>("");
  const [customToDate, setCustomToDate] = useState<string>("");

  // Update custom dates when filter changes
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 29); // 30 days including today
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6); // 7 days including today

    const formatDateInput = (date: Date) => date.toISOString().split("T")[0];

    if (dateFilter === "7days") {
      setCustomFromDate(formatDateInput(sevenDaysAgo));
      setCustomToDate(formatDateInput(today));
    } else if (dateFilter === "30days") {
      setCustomFromDate(formatDateInput(thirtyDaysAgo));
      setCustomToDate(formatDateInput(today));
    } else if (dateFilter === "all") {
      // Find the earliest and latest dates in revenueOverTime
      const dates = revenueOverTime.map((item) =>
        new Date(item.date).getTime()
      );
      const minDate = dates.length > 0 ? new Date(Math.min(...dates)) : today;
      const maxDate = dates.length > 0 ? new Date(Math.max(...dates)) : today;
      setCustomFromDate(formatDateInput(minDate));
      setCustomToDate(formatDateInput(maxDate));
    }
  }, [dateFilter, revenueOverTime]);

  // Filter revenue data by date range
  const filteredRevenue = useMemo(() => {
    let fromTime = -Infinity;
    let toTime = Infinity;

    if (dateFilter === "custom") {
      fromTime = customFromDate
        ? new Date(customFromDate).getTime()
        : -Infinity;
      toTime = customToDate ? new Date(customToDate).getTime() : Infinity;
    } else {
      fromTime = customFromDate
        ? new Date(customFromDate).getTime()
        : -Infinity;
      toTime = customToDate ? new Date(customToDate).getTime() : Infinity;
    }

    return revenueOverTime.filter((item) => {
      const current = new Date(item.date).getTime();
      return current >= fromTime && current <= toTime;
    });
  }, [revenueOverTime, dateFilter, customFromDate, customToDate]);

  // Generate dynamic colors for pie chart
  const generateColors = (count: number) => {
    const colors = [
      "#0ea5e9",
      "#ef4444",
      "#f97316",
      "#eab308",
      "#22c55e",
      "#14b8a6",
      "#06b6d4",
      "#6366f1",
      "#a855f7",
      "#d946ef",
    ];
    return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
  };
  const dynamicColors = useMemo(
    () => generateColors(ticketTypeRevenue.length),
    [ticketTypeRevenue]
  );

  return (
    <div className="container mx-auto px-4 py-8 bg-white-50 dark:bg-gray-900 min-h-screen font-inter">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 dark:text-gray-100">
        Event Overview
      </h1>

      {/* Overview metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Revenue
            </CardTitle>
            <Wallet className="h-5 w-5 text-blue-500 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-50">
              {formatCurrencyVND(totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              actual -20% after receiving{" "}
              {formatCurrencyVND((totalRevenue * 80) / 100)}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Tickets Sold
            </CardTitle>
            <Ticket className="h-5 w-5 text-green-500 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-50">
              {totalTicketsSold.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total tickets sold
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Ticket Sold Rate
            </CardTitle>
            <BarChart className="h-5 w-5 text-purple-500 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-50">
              {ticketSoldPercentage.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalTicketsSold.toLocaleString()} /{" "}
              {totalAvailableTickets.toLocaleString()} tickets
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2 dark:bg-gray-700">
              <div
                className="bg-purple-500 h-2 rounded-full"
                style={{ width: `${ticketSoldPercentage}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Average Ticket Price
            </CardTitle>
            <DollarSign className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-50">
              {formatCurrencyVND(averageTicketPrice)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Revenue / Tickets sold
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue fluctuation chart */}
      <Card className="rounded-xl shadow-lg mb-8">
        <CardHeader className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <CardTitle className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                Revenue Fluctuation
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Revenue over time
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-4 md:mt-0">
              <button
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200
                                    ${dateFilter === "all" ? "bg-blue-600 text-white shadow-md" : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"}`}
                onClick={() => setDateFilter("all")}
              >
                All time
              </button>
              <button
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200
                                    ${dateFilter === "7days" ? "bg-blue-600 text-white shadow-md" : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"}`}
                onClick={() => setDateFilter("7days")}
              >
                Last 7 days
              </button>
              <button
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200
                                    ${dateFilter === "30days" ? "bg-blue-600 text-white shadow-md" : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"}`}
                onClick={() => setDateFilter("30days")}
              >
                Last 30 days
              </button>
              <button
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200
                                    ${dateFilter === "custom" ? "bg-blue-600 text-white shadow-md" : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"}`}
                onClick={() => setDateFilter("custom")}
              >
                Custom
              </button>
              {dateFilter === "custom" && (
                <div className="flex items-center gap-2 mt-2 md:mt-0">
                  <input
                    type="date"
                    value={customFromDate}
                    onChange={(e) => setCustomFromDate(e.target.value)}
                    className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1 text-sm text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="text-sm text-muted-foreground">–</span>
                  <input
                    type="date"
                    value={customToDate}
                    onChange={(e) => setCustomToDate(e.target.value)}
                    className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1 text-sm text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-[350px] p-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={filteredRevenue}
              margin={{ top: 20, right: 30, left: 10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
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
                  return date.toLocaleDateString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                  });
                }}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${formatLargeNumber(Number(value))}`}
              />
              <Tooltip content={<CustomAreaTooltip />} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#3b82f6"
                fill="url(#colorTotal)"
                name="Revenue"
                strokeWidth={2}
                activeDot={{
                  r: 6,
                  fill: "#3b82f6",
                  stroke: "#fff",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Revenue distribution & Recent transactions */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <Card className="rounded-xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-800 dark:text-gray-100">
              Revenue Distribution by Ticket Type
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Revenue ratio and tickets sold for each ticket type
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] flex flex-col items-center justify-center p-4">
            {ticketTypeRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ticketTypeRevenue}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    dataKey="revenue"
                    nameKey="ticketType"
                    paddingAngle={3}
                    labelLine={false}
                    label={({ percent }) =>
                      `${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {ticketTypeRevenue.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={dynamicColors[index]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    wrapperStyle={{ paddingTop: "20px" }}
                    formatter={(value) => {
                      const item = ticketTypeRevenue.find(
                        (t) => t.ticketType === value
                      );
                      return (
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {value} (
                          {item ? formatCurrencyVND(item.revenue) : "N/A"})
                        </span>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-muted-foreground">
                No revenue distribution data.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-800 dark:text-gray-100">
              Recent Transactions
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Latest ticket sales transactions
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[300px] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Transaction ID
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Date
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Ticket Type
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Amount
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {recentTransactions.length > 0 ? (
                    recentTransactions.map((transaction, index) => (
                      <tr
                        key={index}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-50">
                          <span className="inline-block max-w-[50px] truncate">
                            {transaction.id}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(transaction.date).toLocaleDateString(
                            "vi-VN"
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {transaction.ticketType}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-50">
                          {formatCurrencyVND(transaction.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                                                                ${
                                                                  transaction.status ===
                                                                  "paid"
                                                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                                                    : transaction.status ===
                                                                        "pending"
                                                                      ? "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
                                                                      : transaction.status ===
                                                                          "failed"
                                                                        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                                                                        : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
                                                                }`}
                          >
                            {transaction.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-4 text-center text-sm text-muted-foreground"
                      >
                        No recent transactions.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* You can add more charts or detailed information here */}
      {/* For example: revenue by hour of day, ticket source analysis, etc. */}
    </div>
  );
}
