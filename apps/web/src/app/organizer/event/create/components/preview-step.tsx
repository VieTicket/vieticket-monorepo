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
    <div className="bg-white shadow-none rounded-none w-full py-0">
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
  );
}
