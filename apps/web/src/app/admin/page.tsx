"use client";

import { useMemo, useState } from "react";
import {
  DollarSign,
  Calendar,
  Users,
  UserCheck,
  TrendingUp,
  TrendingDown,
  CalendarDays,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import { useAdminStats, useChartData } from "@/hooks/use-admin-data";
import {
  PageSkeleton,
  ChartSkeleton,
  StatsCardSkeleton,
} from "@/components/ui/loading";
import { useDebounce } from "@/hooks/useDebounce";

// Register Chart.js components only once
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Memoized StatCard component
const StatCard = ({
  title,
  value,
  icon: Icon,
  change,
  format = (val: number) => val.toString(),
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  change: number;
  format?: (val: number) => string;
}) => (
  <Card className="bg-white border-gray-200 hover:border-violet-400/50 transition-all duration-300 shadow-sm">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-gray-700">{title}</CardTitle>
      <Icon className="h-4 w-4 text-yellow-500" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-gray-900">{format(value)}</div>
      <div className="flex items-center text-xs text-gray-600 mt-1">
        {change > 0 ? (
          <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
        ) : (
          <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
        )}
        {Math.abs(change)}% from last month
      </div>
    </CardContent>
  </Card>
);

// Memoized currency formatter
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function AdminDashboard() {
  // Date filter state
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Debounce date filters to avoid too many API calls
  const debouncedStartDate = useDebounce(startDate, 500);
  const debouncedEndDate = useDebounce(endDate, 500);

  // Use React Query hooks for data fetching
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useAdminStats();
  const {
    data: chartData,
    isLoading: chartLoading,
    isFetching: chartFetching,
    error: chartError,
  } = useChartData(
    debouncedStartDate || undefined,
    debouncedEndDate || undefined
  );

  // Helper function to set date range presets
  const setDateRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  };

  // Helper function to set month range
  const setMonthRange = (months: number) => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - months);
    start.setDate(1); // Start of month
    
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  };

  // Reset date filter
  const resetDateFilter = () => {
    setStartDate("");
    setEndDate("");
  };

  // Memoized chart data
  const revenueChartData = useMemo(
    () => ({
      labels: chartData?.revenue.labels || [],
      datasets: [
        {
          label: "Revenue",
          data: chartData?.revenue.data || [],
          borderColor: "rgb(59, 130, 246)",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          tension: 0.4,
          fill: true,
        },
      ],
    }),
    [chartData?.revenue]
  );

  const eventsChartData = useMemo(
    () => ({
      labels: chartData?.events.labels || [],
      datasets: [
        {
          label: "Events",
          data: chartData?.events.data || [],
          backgroundColor: "rgba(34, 197, 94, 0.8)",
          borderColor: "rgb(34, 197, 94)",
          borderWidth: 1,
        },
      ],
    }),
    [chartData?.events]
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          top: 10,
          right: 10,
          bottom: 10,
          left: 10,
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(229, 231, 235, 0.8)",
          },
          ticks: {
            padding: 8,
            color: "rgba(75, 85, 99, 0.8)",
          },
        },
        x: {
          grid: {
            display: false,
          },
          ticks: {
            padding: 8,
            color: "rgba(75, 85, 99, 0.8)",
          },
        },
      },
    }),
    []
  );

  // Show loading skeleton only for initial stats load
  if (statsLoading) {
    return <PageSkeleton />;
  }

  // Show error state
  if (statsError || chartError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-yellow-400 via-yellow-300 to-violet-400 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-red-600 mt-2">
            Error loading dashboard:{" "}
            {statsError?.message || chartError?.message || "An error occurred"}
          </p>
        </div>
      </div>
    );
  }

  // Show loading for stats if not available
  if (!stats) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-yellow-400 via-yellow-300 to-violet-400 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-gray-600 mt-2">Loading dashboard data...</p>
        </div>
        <StatsCardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-yellow-400 via-yellow-300 to-violet-400 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-gray-600 mt-2">
          Welcome to your admin dashboard. Here&apos;s an overview of your
          platform.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={stats.totalRevenue}
          icon={DollarSign}
          change={stats.revenueChange}
          format={formatCurrency}
        />
        <StatCard
          title="Approved Events"
          value={stats.ongoingEvents}
          icon={Calendar}
          change={stats.eventsChange}
        />
        <StatCard
          title="Total Organizers"
          value={stats.activeOrganizers}
          icon={UserCheck}
          change={stats.organizersChange}
        />
        <StatCard
          title="All Users"
          value={stats.allUsers}
          icon={Users}
          change={stats.usersChange}
        />
      </div>

      {/* Charts Section */}
      <div className="space-y-4">
        {/* Date Filter */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-yellow-500" />
                <CardTitle className="text-lg text-gray-900">Filter by Date</CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Preset buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateRange(7)}
                    className="text-xs border-gray-300 bg-white text-gray-700 hover:bg-violet-50 hover:border-violet-400 hover:text-violet-700"
                  >
                    7 Days
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateRange(30)}
                    className="text-xs border-gray-300 bg-white text-gray-700 hover:bg-violet-50 hover:border-violet-400 hover:text-violet-700"
                  >
                    30 Days
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMonthRange(3)}
                    className="text-xs border-gray-300 bg-white text-gray-700 hover:bg-violet-50 hover:border-violet-400 hover:text-violet-700"
                  >
                    3 Months
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMonthRange(6)}
                    className="text-xs border-gray-300 bg-white text-gray-700 hover:bg-violet-50 hover:border-violet-400 hover:text-violet-700"
                  >
                    6 Months
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMonthRange(12)}
                    className="text-xs border-gray-300 bg-white text-gray-700 hover:bg-violet-50 hover:border-violet-400 hover:text-violet-700"
                  >
                    12 Months
                  </Button>
                </div>
                
                {/* Custom date range */}
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      const newStartDate = e.target.value;
                      setStartDate(newStartDate);
                      // If endDate is before new startDate, update endDate to startDate
                      if (endDate && newStartDate && endDate < newStartDate) {
                        setEndDate(newStartDate);
                      }
                    }}
                    max={endDate || undefined}
                    className="w-40 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-violet-400"
                    placeholder="From Date"
                  />
                  <span className="text-sm text-gray-600">to</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      const newEndDate = e.target.value;
                      setEndDate(newEndDate);
                      // If startDate is after new endDate, update startDate to endDate
                      if (startDate && newEndDate && startDate > newEndDate) {
                        setStartDate(newEndDate);
                      }
                    }}
                    min={startDate || undefined}
                    max={new Date().toISOString().split("T")[0]}
                    className="w-40 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-violet-400"
                    placeholder="To Date"
                  />
                  {(startDate || endDate) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetDateFilter}
                      className="text-xs text-gray-700 hover:text-violet-700 hover:bg-violet-50"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-gray-900">Revenue Trend</CardTitle>
                {chartFetching && (
                  <div className="text-xs text-gray-600 animate-pulse">
                    Loading...
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="h-[300px] w-full relative -mx-2">
                {chartLoading && !chartData ? (
                  <ChartSkeleton />
                ) : chartData ? (
                  <div className={chartFetching ? "opacity-60 transition-opacity w-full h-full" : "w-full h-full"}>
                    <Line data={revenueChartData} options={chartOptions} />
                  </div>
                ) : (
                  <ChartSkeleton />
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-gray-900">Events Created</CardTitle>
                {chartFetching && (
                  <div className="text-xs text-gray-600 animate-pulse">
                    Loading...
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="h-[300px] w-full relative -mx-2">
                {chartLoading && !chartData ? (
                  <ChartSkeleton />
                ) : chartData ? (
                  <div className={chartFetching ? "opacity-60 transition-opacity w-full h-full" : "w-full h-full"}>
                    <Bar data={eventsChartData} options={chartOptions} />
                  </div>
                ) : (
                  <ChartSkeleton />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
