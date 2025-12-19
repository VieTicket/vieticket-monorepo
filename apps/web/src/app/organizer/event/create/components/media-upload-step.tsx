"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FileUploader } from "@/components/ui/file-uploader";
import { AIImageGenerator } from "@/components/ai/AIImageGenerator";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { X } from "lucide-react";
import type {
  EventFormData,
  UploadResponse,
} from "../../../../../types/event-types";

interface MediaUploadStepProps {
  formData: EventFormData;
  onFormDataChange: (data: React.SetStateAction<EventFormData>) => void;
}

export function MediaUploadStep({
  formData,
  onFormDataChange,
}: MediaUploadStepProps) {
  const t = useTranslations("organizer-dashboard.CreateEvent");

  // ✅ Local state for previews (not needed in parent)
  const [posterPreview, setPosterPreview] = useState<string | null>(
    formData.posterUrl || null
  );
  const [bannerPreview, setBannerPreview] = useState<string | null>(
    formData.bannerUrl || null
  );

  const handlePosterUpload = (response: UploadResponse) => {
    onFormDataChange((prev) => ({ ...prev, posterUrl: response.secure_url }));
    setPosterPreview(response.secure_url);
    toast.success(t("toasts.posterUploaded"));
  };

  const handleBannerUpload = (response: UploadResponse) => {
    onFormDataChange((prev) => ({ ...prev, bannerUrl: response.secure_url }));
    setBannerPreview(response.secure_url);
    toast.success(t("toasts.bannerUploaded"));
  };

  const handlePosterRemove = () => {
    onFormDataChange((prev) => ({ ...prev, posterUrl: "" }));
    setPosterPreview(null);
  };

  const handleBannerRemove = () => {
    onFormDataChange((prev) => ({ ...prev, bannerUrl: "" }));
    setBannerPreview(null);
  };

  const handlePosterGenerated = (imageUrl: string) => {
    onFormDataChange((prev) => ({ ...prev, posterUrl: imageUrl }));
    setPosterPreview(imageUrl);
  };

  const handleBannerGenerated = (imageUrl: string) => {
    onFormDataChange((prev) => ({ ...prev, bannerUrl: imageUrl }));
    setBannerPreview(imageUrl);
  };

  const handleUploadError = (error: Error) => {
    toast.error(t("toasts.uploadFailed", { message: error.message }));
  };

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
              {posterPreview ? (
                <>
                  <img
                    src={posterPreview}
                    alt={t("ai.media.posterAlt")}
                    className="w-full h-full object-cover"
                  />
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-4">
                  <FileUploader
                    onUploadSuccess={handlePosterUpload}
                    onUploadError={handleUploadError}
                    folder="event-posters"
                    mode="dropzone"
                    buttonLabel={t("ai.media.uploadButtonPoster")}
                    className="h-[100%]"
                  />
                </div>
              )}
            </div>

            {posterPreview && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePosterRemove}
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
              onImageGenerated={handlePosterGenerated}
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
              {bannerPreview ? (
                <>
                  <img
                    src={bannerPreview}
                    alt={t("ai.media.bannerAlt")}
                    className="w-full h-full object-cover"
                  />
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-4">
                  <FileUploader
                    onUploadSuccess={handleBannerUpload}
                    onUploadError={handleUploadError}
                    folder="event-banners"
                    mode="dropzone"
                    buttonLabel={t("ai.media.uploadButtonBanner")}
                    className="h-[100%]"
                  />
                </div>
              )}
            </div>

            {bannerPreview && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleBannerRemove}
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
                onImageGenerated={handleBannerGenerated}
                eventType={formData.type}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Documents and Contract Upload Section */}
      <div className="space-y-6 sm:space-y-8 pt-6 border-t">
        <div className="space-y-2">
          <Label className="text-sm sm:text-base font-medium">
            Documents and Contract
            <span className="text-xs sm:text-sm font-normal text-red-500 ml-2">
              (Required)
            </span>
          </Label>
          <p className="text-xs sm:text-sm text-gray-600">
            Please provide document images and contract so the event can be approved.
          </p>
        </div>

        {/* Documents Upload */}
        <div className="space-y-3 sm:space-y-4">
          <Label className="text-sm font-medium">
            Document Images
            <span className="text-xs font-normal text-gray-500 ml-2">
              (Multiple images can be uploaded)
            </span>
          </Label>
          <DocumentsUpload
            documents={formData.documentUrls || []}
            onDocumentsChange={(urls) => {
              onFormDataChange((prev) => ({ ...prev, documentUrls: urls }));
            }}
          />
        </div>

        {/* Contract Upload */}
        <div className="space-y-3 sm:space-y-4">
          <Label className="text-sm font-medium">
            Contract Image
            <span className="text-xs font-normal text-gray-500 ml-2">
              (Required)
            </span>
          </Label>
          <ContractUpload
            contractUrl={formData.contractUrl || ""}
            onContractChange={(url) => {
              onFormDataChange((prev) => ({ ...prev, contractUrl: url }));
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Documents Upload Component
function DocumentsUpload({
  documents,
  onDocumentsChange,
}: {
  documents: string[];
  onDocumentsChange: (urls: string[]) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const t = useTranslations("organizer-dashboard.CreateEvent");

  const handleUpload = async (response: UploadResponse) => {
    onDocumentsChange([...documents, response.secure_url]);
    toast.success("Document uploaded successfully");
  };

  const handleRemove = (index: number) => {
    const newDocuments = documents.filter((_, i) => i !== index);
    onDocumentsChange(newDocuments);
    toast.success("Document removed");
  };

  return (
    <div className="space-y-4">
      <FileUploader
        onUploadSuccess={handleUpload}
        onUploadError={(error) => {
          toast.error(`Upload failed: ${error.message}`);
        }}
        folder="event-documents"
        mode="dropzone"
        buttonLabel="Upload Documents"
      />
      
      {documents.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {documents.map((url, index) => (
            <div key={index} className="relative group">
              <img
                src={url}
                alt={`Document ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemove(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Contract Upload Component
function ContractUpload({
  contractUrl,
  onContractChange,
}: {
  contractUrl: string;
  onContractChange: (url: string) => void;
}) {
  const handleUpload = async (response: UploadResponse) => {
    onContractChange(response.secure_url);
    toast.success("Contract uploaded successfully");
  };

  const handleRemove = () => {
    onContractChange("");
    toast.success("Contract removed");
  };

  return (
    <div className="space-y-4">
      {contractUrl ? (
        <div className="relative group">
          <img
            src={contractUrl}
            alt="Contract"
            className="w-full max-h-96 object-contain rounded-lg border"
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="mt-2"
            onClick={handleRemove}
          >
            Remove Contract
          </Button>
        </div>
      ) : (
        <FileUploader
          onUploadSuccess={handleUpload}
          onUploadError={(error) => {
            toast.error(`Upload failed: ${error.message}`);
          }}
          folder="event-contracts"
          mode="dropzone"
          buttonLabel="Upload Contract"
        />
      )}
    </div>
  );
}
