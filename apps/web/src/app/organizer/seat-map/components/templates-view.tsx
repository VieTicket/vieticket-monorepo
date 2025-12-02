"use client";

import { ArrowLeft, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TemplateCard } from "./template-card";

type PublicSeatMapItem = {
  id: string;
  name: string;
  image: string;
  createdBy: string;
  originalCreator?: string;
  draftedFrom?: string;
  createdAt: string;
  updatedAt: string;
  draftCount?: number;
};

interface TemplatesViewProps {
  publicSeatMaps: PublicSeatMapItem[];
  isLoadingTemplates: boolean;
  templatesSearchQuery: string;
  setTemplatesSearchQuery: (query: string) => void;
  onBack: () => void;
  onCreateDraft: (seatMap: PublicSeatMapItem) => void;
  isCreatingDraft: string | null;
  formatDate: (date: string) => string;
}

export function TemplatesView({
  publicSeatMaps,
  isLoadingTemplates,
  templatesSearchQuery,
  setTemplatesSearchQuery,
  onBack,
  onCreateDraft,
  isCreatingDraft,
  formatDate,
}: TemplatesViewProps) {
  return (
    <>
      {/* Templates View Header */}
      <div className="border-b dark:border-gray-800 p-4 flex justify-between items-center h-20">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            aria-label="Back to Seat Maps"
          >
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            Community Templates
          </h1>
        </div>

        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
            size={18}
          />
          <Input
            placeholder="Search templates..."
            className="min-w-32 pl-10"
            value={templatesSearchQuery}
            onChange={(e) => setTemplatesSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Templates Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoadingTemplates ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : publicSeatMaps.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
            {publicSeatMaps.map((seatMap) => (
              <TemplateCard
                key={seatMap.id}
                seatMap={seatMap}
                onCreateDraft={onCreateDraft}
                isCreatingDraft={isCreatingDraft === seatMap.id}
                formatDate={formatDate}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <Star className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {templatesSearchQuery
                ? "No templates match your search"
                : "No public templates available yet"}
            </p>
            {!templatesSearchQuery && (
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Be the first to share your seat map with the community!
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
