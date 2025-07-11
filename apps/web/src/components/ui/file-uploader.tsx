"use client";

import { useCallback, useRef, useState } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import { ImageUp, File as FileIcon, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";

// Define the structure of the Cloudinary upload response
interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  version: number;
  width: number;
  height: number;
  format: string;
  created_at: string;
  bytes: number;
  type: string;
  url: string;
}

// Utility function để upload file lên Cloudinary, có thể dùng ở component khác
export const uploadFileToCloudinary = async (
  file: File,
  folder: string,
  onProgress?: (progress: number) => void
): Promise<CloudinaryUploadResponse> => {
  try {
    // 1. Get signature from our Next.js API route
    const timestamp = Math.round(new Date().getTime() / 1000);
    const public_id = `${folder}/${file.name}`;

    const response = await fetch("/api/sign-cloudinary-params", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paramsToSign: { timestamp, public_id },
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to get signature.");
    }

    const signedData = await response.json();

    // 2. Upload file to Cloudinary using the signature
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", signedData.api_key);
    formData.append("timestamp", signedData.timestamp);
    formData.append("signature", signedData.signature);
    formData.append("public_id", signedData.public_id);

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

    const uploadResponse = await axios.post<CloudinaryUploadResponse>(
      uploadUrl,
      formData,
      {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percentCompleted);
          }
        },
      }
    );

    return uploadResponse.data;
  } catch (error) {
    console.error("Upload failed:", error);
    throw error instanceof Error
      ? error
      : new Error("An unknown error occurred");
  }
};

// Define the props for our component
interface FileUploaderProps {
  onUploadSuccess: (response: CloudinaryUploadResponse) => void;
  onUploadError?: (error: Error) => void;
  /** The folder path in Cloudinary where the file will be uploaded. */
  folder: string;
  /** Max file size in bytes. Defaults to 4.5MB */
  maxSize?: number;
  mode?: "dropzone" | "button" | "both";
  buttonLabel?: string;
}

export function FileUploader({
  onUploadSuccess,
  onUploadError,
  folder,
  maxSize = 8 * 1024 * 1024,
  mode = "both",
  buttonLabel = "Upload Image",
}: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
      handleUpload(file);
    }
  };

  const handleUpload = useCallback(
    async (fileToUpload: File) => {
      if (isUploading) return;

      setIsUploading(true);
      setProgress(0);

      try {
        const result = await uploadFileToCloudinary(
          fileToUpload,
          folder,
          setProgress
        );

        toast.success(`${fileToUpload.name} has been uploaded.`, {
          description: "Upload Successful",
        });
        onUploadSuccess(result);
        resetState();
      } catch (error) {
        console.error("Upload failed:", error);
        const err =
          error instanceof Error
            ? error
            : new Error("An unknown error occurred");
        toast.error(err.message, {
          description: "Upload Failed",
        });
        if (onUploadError) {
          onUploadError(err);
        }
        resetState();
      }
    },
    [isUploading, folder, onUploadSuccess, onUploadError]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (fileRejections.length > 0) {
        toast.error(
          `File is larger than ${maxSize / 1024 / 1024}MB or is not an accepted type.`,
          { description: "File rejected" }
        );
        return;
      }
      if (acceptedFiles.length > 0) {
        setFile(acceptedFiles[0]);
        handleUpload(acceptedFiles[0]);
      }
    },
    [maxSize, handleUpload]
  );

  const resetState = () => {
    setFile(null);
    setIsUploading(false);
    setProgress(0);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".gif", ".jpeg", ".jpg"],
      "application/pdf": [".pdf"],
    },
    maxSize,
    multiple: false,
    disabled: mode === "button",
  });

  return (
    <div className="w-full">
      {/* Only show dropzone if mode is not "button" */}
      {mode !== "button" && (!file || !isUploading) && (
        <div
          {...getRootProps()}
          className={`flex h-full w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-800 ${
            isDragActive ? "border-blue-500 bg-blue-50" : ""
          }`}
        >
          <input {...getInputProps()} />
          <ImageUp className="mb-2 h-10 w-10 text-gray-500 dark:text-gray-400" />
          <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="font-semibold">Click to upload</span> or drag and
            drop
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Images or PDF (MAX. {maxSize / 1024 / 1024}MB)
          </p>
        </div>
      )}

      {/* Only show button if mode is not "dropzone" */}
      {mode !== "dropzone" && (!file || !isUploading) && (
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={handleButtonClick}
            className="flex items-center gap-2"
            disabled={isUploading}
          >
            {isUploading ? (
              <span className="flex items-center gap-2">
                <ImageUp className="w-4 h-4 animate-spin" />
                Uploading...
              </span>
            ) : (
              <>
                <ImageUp className="w-4 h-4" />
                {buttonLabel}
              </>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileInputChange}
            disabled={isUploading}
          />
        </div>
      )}

      {/* Show upload progress if uploading */}
      {file && isUploading && (
        <div className="w-full rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileIcon className="h-6 w-6 text-gray-500" />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {file.name}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={resetState}
              className="h-6 w-6"
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Progress value={progress} className="mt-2 h-2" />
          <p className="mt-1 text-right text-xs text-gray-500">{progress}%</p>
        </div>
      )}
    </div>
  );
}
