"use client";

import { Suspense, lazy } from "react";
import { Spinner } from "./loading";

interface DynamicImportProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// Dynamic import wrapper component
export function DynamicImport({ children, fallback }: DynamicImportProps) {
  return (
    <Suspense fallback={fallback || <Spinner size="lg" />}>
      {children}
    </Suspense>
  );
}

// Simple lazy chart component
const LazyLineChart = lazy(() => 
  import('react-chartjs-2').then(module => ({ default: module.Line }))
);

const LazyBarChart = lazy(() => 
  import('react-chartjs-2').then(module => ({ default: module.Bar }))
);

// Wrapper components with proper loading states
export function LazyLineChartWrapper(props: React.ComponentProps<typeof LazyLineChart>) {
  return (
    <DynamicImport fallback={<div className="h-[300px] flex items-center justify-center">Loading chart...</div>}>
      <LazyLineChart {...props} />
    </DynamicImport>
  );
}

export function LazyBarChartWrapper(props: React.ComponentProps<typeof LazyBarChart>) {
  return (
    <DynamicImport fallback={<div className="h-[300px] flex items-center justify-center">Loading chart...</div>}>
      <LazyBarChart {...props} />
    </DynamicImport>
  );
} 