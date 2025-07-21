import { Card, CardContent, CardHeader } from "./card";

// Skeleton loader for cards
export const CardSkeleton = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
      <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
    </CardHeader>
    <CardContent>
      <div className="h-8 bg-gray-200 rounded animate-pulse mb-2" />
      <div className="h-3 bg-gray-200 rounded animate-pulse" />
    </CardContent>
  </Card>
);

// Skeleton loader for stats cards
export const StatsCardSkeleton = () => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    {[...Array(4)].map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

// Skeleton loader for charts
export const ChartSkeleton = () => (
  <Card>
    <CardHeader>
      <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
    </CardHeader>
    <CardContent>
      <div className="h-[300px] bg-gray-100 rounded animate-pulse flex items-center justify-center">
        <div className="text-gray-400">Loading chart...</div>
      </div>
    </CardContent>
  </Card>
);

// Skeleton loader for tables
export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-3">
    {[...Array(rows)].map((_, i) => (
      <div key={i} className="flex space-x-4">
        <div className="h-4 bg-gray-200 rounded animate-pulse flex-1" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-16" />
      </div>
    ))}
  </div>
);

// Spinner component
export const Spinner = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div
      className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-gray-300 border-t-blue-600`}
    />
  );
};

// Page loading skeleton
export const PageSkeleton = () => (
  <div className="space-y-6">
    <div>
      <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
      <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
    </div>
    <StatsCardSkeleton />
    <div className="grid gap-4 md:grid-cols-2">
      <ChartSkeleton />
      <ChartSkeleton />
    </div>
  </div>
);
