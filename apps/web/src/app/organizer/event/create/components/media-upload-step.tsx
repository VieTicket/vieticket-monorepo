"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FileUploader } from "@/components/ui/file-uploader";
import { AIImageGenerator } from "@/components/ai/AIImageGenerator";
import type {
  EventFormData,
  UploadResponse,
} from "../../../../../types/event-types";

interface MediaUploadStepProps {
  formData: EventFormData;
  onPosterUpload: (response: UploadResponse) => void;
  onBannerUpload: (response: UploadResponse) => void;
  onUploadError: (error: Error) => void;
  onPosterRemove: () => void;
  onBannerRemove: () => void;
  onPosterGenerated: (imageUrl: string) => void;
  onBannerGenerated: (imageUrl: string) => void;
}

export function MediaUploadStep({
  formData,
  onPosterUpload,
  onBannerUpload,
  onUploadError,
  onPosterRemove,
  onBannerRemove,
  onPosterGenerated,
  onBannerGenerated,
}: MediaUploadStepProps) {
  return (
    <div className="space-y-8">
      {/* Poster Upload Section */}
      <div className="space-y-4">
        <Label className="text-base font-medium">
          Event Poster
          <span className="text-sm font-normal text-gray-500 ml-2">
            (Recommended: 600x800px or 3:4 ratio)
          </span>
        </Label>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Manual Upload */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">
              Upload Your Own
            </h3>
            <div className="relative w-full aspect-[3/4] border rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
              {formData.posterUrl ? (
                <>
                  <img
                    src={formData.posterUrl}
                    alt="Event poster preview"
                    className="w-full h-full object-cover"
                  />
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <FileUploader
                    onUploadSuccess={onPosterUpload}
                    onUploadError={onUploadError}
                    folder="event-posters"
                    mode="dropzone"
                    buttonLabel="Upload Poster"
                    className="h-[100%]"
                  />
                </div>
              )}
            </div>

            {formData.posterUrl && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onPosterRemove}
                >
                  Remove Poster
                </Button>
              </div>
            )}
          </div>

          {/* AI Generation */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">
              Generate with AI
            </h3>
            <AIImageGenerator
              type="poster"
              onImageGenerated={onPosterGenerated}
              eventType={formData.type}
            />
          </div>
        </div>
      </div>

      {/* Banner Upload Section */}
      <div className="space-y-4">
        <Label className="text-base font-medium">
          Event Banner
          <span className="text-sm font-normal text-gray-500 ml-2">
            (Recommended: 1280x720px or 16:9 ratio)
          </span>
        </Label>

        <div className="space-y-6">
          {/* Manual Upload */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">
              Upload Your Own
            </h3>
            <div className="relative w-full aspect-[16/9] border rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
              {formData.bannerUrl ? (
                <>
                  <img
                    src={formData.bannerUrl}
                    alt="Event banner preview"
                    className="w-full h-full object-cover"
                  />
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <FileUploader
                    onUploadSuccess={onBannerUpload}
                    onUploadError={onUploadError}
                    folder="event-banners"
                    mode="dropzone"
                    buttonLabel="Upload Banner"
                    className="h-[100%]"
                  />
                </div>
              )}
            </div>

            {formData.bannerUrl && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onBannerRemove}
                >
                  Remove Banner
                </Button>
              </div>
            )}
          </div>

          {/* AI Generation for Banner */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">
              Generate Banner with AI
            </h3>
            <div className="w-full">
              <AIImageGenerator
                type="banner"
                onImageGenerated={onBannerGenerated}
                eventType={formData.type}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
