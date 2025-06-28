"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatCurrencyVND } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type RevenueOverTimeItem = {
  date: string;
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
};

const COLORS = ["#ffdf20", "#2a273f", "#8884d8", "#82ca9d", "#ffc658"];

export default function OrganizerDashboardClient({
  revenueOverTime,
  revenueDistribution,
  topEvents,
}: {
  revenueOverTime: RevenueOverTimeItem[];
  revenueDistribution: RevenueDistributionItem[];
  topEvents: TopEventItem[];
}) {
  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">📌 Organizer General Info</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-yellow-600">
            {formatCurrencyVND(
              revenueOverTime
                .reduce((sum, item) => sum + item.total, 0)
            )}{" "}
            VND
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Events</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {topEvents.length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top Event Revenue</CardTitle>
          </CardHeader>
          <CardContent className="text-lg">
            {topEvents[0]?.eventName}:{" "}
            <span className="font-semibold text-green-600">
              {topEvents[0]?.totalRevenue?.toLocaleString() || "0"} VND
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Over Time Chart */}
        <Card className="h-[350px]">
          <CardHeader>
            <CardTitle>📈 Revenue Over Time</CardTitle>
          </CardHeader>
          <CardContent className="h-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueOverTime}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#ffdf20"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Distribution Pie */}
        <Card className="h-[350px]">
          <CardHeader>
            <CardTitle>🥧 Revenue Distribution by Event</CardTitle>
          </CardHeader>
          <CardContent className="h-full flex justify-center items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={revenueDistribution}
                  dataKey="total"
                  nameKey="eventName"
                  outerRadius={100}
                  label
                >
                  {revenueDistribution.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>🏆 Top Events by Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 font-semibold mb-2">
            <span>Event</span>
            <span>Revenue</span>
            <span>Event ID</span>
          </div>
          {topEvents.map((event) => (
            <div
              key={event.eventId}
              className="grid grid-cols-3 py-2 border-t text-sm"
            >
              <span>{event.eventName}</span>
              <span className="text-green-700">
                {event.totalRevenue.toLocaleString()} VND
              </span>
              <span className="truncate text-gray-500">{event.eventId}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
