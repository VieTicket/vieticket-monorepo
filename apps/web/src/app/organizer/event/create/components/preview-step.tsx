"use client";

import { PreviewEvent } from "@/components/create-event/preview";
import { slugify } from "@/lib/utils";
import type { EventFormData } from "../../../../../types/event-types";

interface PreviewStepProps {
  formData: EventFormData;
}

export function PreviewStep({ formData }: PreviewStepProps) {
  return (
    <div className="bg-white shadow-none rounded-none w-full py-0">
      <PreviewEvent
        data={{
          ...formData,
          slug: `${slugify(formData.name)}-preview`,
          organizer: null,
          areas: [],
          isPreview: true,
        }}
      />
    </div>
  );
}
