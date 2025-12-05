"use client";

import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

const scrollbarHideStyle = `
  .tabs-scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .tabs-scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
`;

export function Tabs({ tabs, activeTab, onTabChange, className }: TabsProps) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: scrollbarHideStyle }} />
      <div className={cn("border-b border-gray-200 overflow-x-auto tabs-scrollbar-hide", className)}>
        <nav className="-mb-px flex space-x-8 min-w-max px-4 sm:px-0" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors flex-shrink-0",
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium",
                    activeTab === tab.id
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-100 text-gray-900"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}
