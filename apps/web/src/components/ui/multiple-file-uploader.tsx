"use client";

import { useCallback, useRef, useState } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import { ImageUp, File as FileIcon, X, CheckCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { uploadMultipleFilesToCloudinary, type CloudinaryUploadResponse } from "./file-uploader";

// Re-export for convenience
export type { CloudinaryUploadResponse };

interface UploadingFile {
  file: File;
  progress: number;
  status: "uploading" | "completed" | "error";
  result?: CloudinaryUploadResponse;
  error?: string;
}

interface MultipleFileUploaderProps {
  onUploadSuccess: (results: CloudinaryUploadResponse[]) => void;
  onUploadError?: (error: Error) => void;
  onFileComplete?: (result: CloudinaryUploadResponse, index: number) => void;
  /** The folder path in Cloudinary where files will be uploaded. */
  folder: string;
  /** Max file size in bytes. Defaults to 8MB */
  maxSize?: number;
  /** Maximum number of files allowed. Defaults to 10 */
  maxFiles?: number;
  mode?: "dropzone" | "button" | "both";
  buttonLabel?: string;
  /** Custom className for the component */
  className?: string;
  /** Accepted file types */
  acceptedTypes?: Record<string, string[]>;
}

export function MultipleFileUploader({
  onUploadSuccess,
  onUploadError,
  onFileComplete,
  folder,
  maxSize = 8 * 1024 * 1024,
  maxFiles = 10,
  mode = "both",
  buttonLabel = "Upload Evidence Images",
  className = "",
  acceptedTypes = {
    "image/*": [".png", ".gif", ".jpeg", ".jpg"],
    "application/pdf": [".pdf"],
  },
}: MultipleFileUploaderProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleUpload(files);
    }
  };

  const handleUpload = useCallback(
    async (filesToUpload: File[]) => {
      if (isUploading) return;

      // Check max files limit
      if (filesToUpload.length > maxFiles) {
        toast.error(`You can only upload up to ${maxFiles} files at once.`);
        return;
      }

      setIsUploading(true);
      
      // Initialize uploading files state
      const initialUploadingFiles: UploadingFile[] = filesToUpload.map(file => ({
        file,
        progress: 0,
        status: "uploading",
      }));
      
      setUploadingFiles(initialUploadingFiles);

      try {
        const results = await uploadMultipleFilesToCloudinary(
          filesToUpload,
          folder,
          // On progress callback
          (fileIndex, progress) => {
            setUploadingFiles(prev => 
              prev.map((item, index) => 
                index === fileIndex 
                  ? { ...item, progress }
                  : item
              )
            );
          },
          // On complete callback
          (fileIndex, result) => {
            setUploadingFiles(prev => 
              prev.map((item, index) => 
                index === fileIndex 
                  ? { ...item, status: "completed", result, progress: 100 }
                  : item
              )
            );
            onFileComplete?.(result, fileIndex);
          }
        );

        toast.success(`Successfully uploaded ${results.length} file(s).`);
        onUploadSuccess(results);
        resetState();
      } catch (error) {
        console.error("Upload failed:", error);
        const err =
          error instanceof Error
            ? error
            : new Error("An unknown error occurred");
        
        // Update failed files
        setUploadingFiles(prev => 
          prev.map(item => 
            item.status === "uploading" 
              ? { ...item, status: "error", error: err.message }
              : item
          )
        );
        
        toast.error(err.message, {
          description: "Upload Failed",
        });
        
        if (onUploadError) {
          onUploadError(err);
        }
      } finally {
        setIsUploading(false);
      }
    },
    [isUploading, folder, maxFiles, onUploadSuccess, onUploadError, onFileComplete]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (fileRejections.length > 0) {
        const reasons = fileRejections.map(rejection => 
          rejection.errors.map(error => error.message).join(", ")
        ).join("; ");
        
        toast.error(`Some files were rejected: ${reasons}`);
        return;
      }
      
      if (acceptedFiles.length > 0) {
        handleUpload(acceptedFiles);
      }
    },
    [handleUpload]
  );

  const resetState = () => {
    setUploadingFiles([]);
    setIsUploading(false);
  };

  const removeFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes,
    maxSize,
    multiple: true,
    disabled: mode === "button" || isUploading,
  });

  return (
    <div className={`w-full ${className}`}>
      {/* Only show dropzone if mode is not "button" */}
      {mode !== "button" && uploadingFiles.length === 0 && (
        <div
          {...getRootProps()}
          className={`flex h-48 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-800 ${
            isDragActive ? "border-blue-500 bg-blue-50" : ""
          }`}
        >
          <input {...getInputProps()} />
          <ImageUp className="mb-4 h-16 w-16 text-gray-400 dark:text-gray-500" />
          <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Images or PDF (MAX. {maxSize / 1024 / 1024}MB each, {maxFiles} files max)
          </p>
        </div>
      )}

      {/* Only show button if mode is not "dropzone" */}
      {mode !== "dropzone" && uploadingFiles.length === 0 && (
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
            accept={Object.values(acceptedTypes).flat().join(",")}
            multiple
            className="hidden"
            onChange={handleFileInputChange}
            disabled={isUploading}
          />
        </div>
      )}

      {/* Show upload progress for multiple files */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              Uploading {uploadingFiles.length} file(s)
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetState}
              disabled={isUploading}
              className="text-xs"
            >
              Cancel All
            </Button>
          </div>
          
          {uploadingFiles.map((uploadingFile, index) => (
            <div key={index} className="w-full rounded-lg border p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {uploadingFile.status === "completed" ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : uploadingFile.status === "error" ? (
                    <X className="h-5 w-5 text-red-500" />
                  ) : (
                    <FileIcon className="h-5 w-5 text-gray-500" />
                  )}
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                    {uploadingFile.file.name}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                  className="h-6 w-6 flex-shrink-0"
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {uploadingFile.status === "uploading" && (
                <>
                  <Progress value={uploadingFile.progress} className="h-2" />
                  <p className="mt-1 text-right text-xs text-gray-500">
                    {uploadingFile.progress}%
                  </p>
                </>
              )}
              
              {uploadingFile.status === "completed" && (
                <p className="text-xs text-green-600">Upload completed successfully</p>
              )}
              
              {uploadingFile.status === "error" && (
                <p className="text-xs text-red-600">
                  Error: {uploadingFile.error}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}