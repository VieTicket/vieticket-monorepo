"use client";

import { PreviewEvent } from "@/components/create-event/preview";
import { slugify } from "@/lib/utils";
import type { EventFormData } from "../../../../../types/event-types";
import type { ShowingFormData } from "@/types/showings";

interface PreviewStepProps {
  formData: EventFormData;
  showings: ShowingFormData[];
}

export function PreviewStep({ formData, showings }: PreviewStepProps) {
  return (
    <div className="relative w-full">
      {/* Full height embedded preview without scroll */}
      <div className="relative rounded-xl overflow-hidden border border-slate-700/50 shadow-2xl bg-slate-950">
        <PreviewEvent
          data={{
            ...formData,
            slug: `${slugify(formData.name)}-preview`,
            organizer: null,
            areas: [],
            showings: showings,
            isPreview: true,
          }}
        />
      </div>
      
      {/* Step navigation hint */}
    
    </div>
  );
}
