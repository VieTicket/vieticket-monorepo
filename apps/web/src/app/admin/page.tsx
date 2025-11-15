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
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{format(value)}</div>
      <div className="flex items-center text-xs text-muted-foreground">
        {change > 0 ? (
          <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
        ) : (
          <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
        )}
        {Math.abs(change)}% from last month
      </div>
    </CardContent>
  </Card>
);

// Memoized currency formatter
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
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

  // Use React Query hooks for data fetching
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useAdminStats();
  const {
    data: chartData,
    isLoading: chartLoading,
    error: chartError,
  } = useChartData(startDate || undefined, endDate || undefined);

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
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(0, 0, 0, 0.1)",
          },
        },
        x: {
          grid: {
            display: false,
          },
        },
      },
    }),
    []
  );

  // Show loading skeleton if either data is loading
  if (statsLoading || chartLoading) {
    return <PageSkeleton />;
  }

  // Show error state
  if (statsError || chartError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-red-500">
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
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </div>
        <StatsCardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
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
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Lọc theo thời gian</CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Preset buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateRange(7)}
                    className="text-xs"
                  >
                    7 ngày
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateRange(30)}
                    className="text-xs"
                  >
                    30 ngày
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMonthRange(3)}
                    className="text-xs"
                  >
                    3 tháng
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMonthRange(6)}
                    className="text-xs"
                  >
                    6 tháng
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMonthRange(12)}
                    className="text-xs"
                  >
                    12 tháng
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
                    className="w-40"
                    placeholder="Từ ngày"
                  />
                  <span className="text-sm text-muted-foreground">đến</span>
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
                    className="w-40"
                    placeholder="Đến ngày"
                  />
                  {(startDate || endDate) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetDateFilter}
                      className="text-xs"
                    >
                      Xóa
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {chartData ? (
                  <Line data={revenueChartData} options={chartOptions} />
                ) : (
                  <ChartSkeleton />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Events Created</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {chartData ? (
                  <Bar data={eventsChartData} options={chartOptions} />
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
