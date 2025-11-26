"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FileUploader } from "@/components/ui/file-uploader";
import { AIImageGenerator } from "@/components/ai/AIImageGenerator";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("organizer-dashboard.CreateEvent");
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Poster Upload Section */}
      <div className="space-y-3 sm:space-y-4">
        <Label className="text-sm sm:text-base font-medium">
          {t("ai.media.posterTitle")}
          <span className="text-xs sm:text-sm font-normal text-gray-500 ml-2">
            ({t("ai.media.posterRecommended")})
          </span>
        </Label>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
          {/* Manual Upload */}
          <div className="space-y-2 sm:space-y-3">
            <h3 className="text-xs sm:text-sm font-medium text-gray-700">
              {t("ai.media.uploadYourOwn")}
            </h3>
            <div className="relative w-full aspect-[3/4] border rounded-lg overflow-hidden bg-gray-50 sm:bg-gray-100 flex items-center justify-center min-h-[200px] sm:min-h-[250px]">
              {formData.posterUrl ? (
                <>
                  <img
                    src={formData.posterUrl}
                    alt={t("ai.media.posterAlt")}
                    className="w-full h-full object-cover"
                  />
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-4">
                  <FileUploader
                    onUploadSuccess={onPosterUpload}
                    onUploadError={onUploadError}
                    folder="event-posters"
                    mode="dropzone"
                    buttonLabel={t("ai.media.uploadButtonPoster")}
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
                  className="h-8 text-xs sm:text-sm"
                >
                  {t("ai.media.removePoster")}
                </Button>
              </div>
            )}
          </div>

          {/* AI Generation */}
          <div className="space-y-2 sm:space-y-3">
            <h3 className="text-xs sm:text-sm font-medium text-gray-700">
              {t("ai.media.generateWithAI")}
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
      <div className="space-y-3 sm:space-y-4">
        <Label className="text-sm sm:text-base font-medium">
          {t("ai.media.bannerTitle")}
          <span className="text-xs sm:text-sm font-normal text-gray-500 ml-2">
            ({t("ai.media.bannerRecommended")})
          </span>
        </Label>

        <div className="space-y-4 sm:space-y-6">
          {/* Manual Upload */}
          <div className="space-y-2 sm:space-y-3">
            <h3 className="text-xs sm:text-sm font-medium text-gray-700">
              {t("ai.media.uploadYourOwn")}
            </h3>
            <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] border rounded-lg overflow-hidden bg-gray-50 sm:bg-gray-100 flex items-center justify-center min-h-[150px] sm:min-h-[200px]">
              {formData.bannerUrl ? (
                <>
                  <img
                    src={formData.bannerUrl}
                    alt={t("ai.media.bannerAlt")}
                    className="w-full h-full object-cover"
                  />
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-4">
                  <FileUploader
                    onUploadSuccess={onBannerUpload}
                    onUploadError={onUploadError}
                    folder="event-banners"
                    mode="dropzone"
                    buttonLabel={t("ai.media.uploadButtonBanner")}
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
                  className="h-8 text-xs sm:text-sm"
                >
                  {t("ai.media.removeBanner")}
                </Button>
              </div>
            )}
          </div>

          {/* AI Generation for Banner */}
          <div className="space-y-2 sm:space-y-3">
            <h3 className="text-xs sm:text-sm font-medium text-gray-700">
              {t("ai.media.generateBannerWithAI")}
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
