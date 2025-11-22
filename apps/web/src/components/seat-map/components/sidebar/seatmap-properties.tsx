import React, { useCallback, useEffect } from "react";
import { useSeatMapStore } from "../../store/seat-map-store";
import { toast } from "sonner";
import { uploadBlobToCloudinary } from "@/components/ui/file-uploader";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImageIcon, Upload, Loader2 } from "lucide-react";
import { useDebounceState } from "@/hooks/useDebounce";

export const SeatMapProperties = () => {
  // ✅ Subscribe to seatMap updates to trigger re-renders
  const seatMap = useSeatMapStore((state) => state.seatMap);
  const setSeatMap = useSeatMapStore((state) => state.setSeatMap);
  const isLoading = useSeatMapStore((state) => state.isLoading);

  // ✅ Use debounced state for seat map name
  const [
    seatMapName,
    debouncedSeatMapName,
    setSeatMapName,
    setSeatMapNameImmediate,
  ] = useDebounceState(seatMap?.name || "", 500);

  const [isUploadingImage, setIsUploadingImage] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  // ✅ Update local state when seatMap changes from server
  useEffect(() => {
    if (seatMap?.name && seatMap.name !== seatMapName) {
      setSeatMapNameImmediate(seatMap.name);
    }
  }, [seatMap?.name]);

  // ✅ Handle debounced name updates
  useEffect(() => {
    if (
      debouncedSeatMapName &&
      seatMap &&
      debouncedSeatMapName !== seatMap.name
    ) {
      setSeatMap({ ...seatMap, name: debouncedSeatMapName });
    }
  }, [debouncedSeatMapName, seatMap, setSeatMap]);

  const handleSeatMapNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newName = e.target.value;
      setSeatMapName(newName);
    },
    [setSeatMapName]
  );

  const handleImageUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !seatMap) {
        console.warn("⚠️ No file selected or seat map not initialized");
        return;
      }

      // ✅ Validate file type
      if (!file.type.startsWith("image/")) {
        console.error("Invalid file type:", file.type);
        toast.error("Please select a valid image file", {
          description: "Only image files (JPG, PNG, WebP) are allowed",
        });
        return;
      }

      // ✅ Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        console.error(`File size exceeds limit: ${file.size} bytes`);
        toast.error("Image size must be less than 5MB", {
          description: `Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`,
        });
        return;
      }

      setIsUploadingImage(true);
      setUploadProgress(0);
      toast.info("Uploading image...", {
        description: "Please wait while we upload your image",
      });

      try {
        // ✅ Generate filename with sanitized seat map name
        const sanitizedName =
          seatMap.name.replace(/[^a-zA-Z0-9]/g, "_") || "seatmap";
        const fileExtension = file.name.split(".").pop() || "jpg";
        const filename = `${sanitizedName}_preview_${Date.now()}.${fileExtension}`;

        // ✅ Upload to Cloudinary with progress tracking
        const uploadResponse = await uploadBlobToCloudinary(
          file,
          filename,
          "seat-maps",
          (progress) => {
            setUploadProgress(progress);
          }
        );

        // ✅ Update seat map with new image URL
        setSeatMap({
          ...seatMap,
          image: uploadResponse.secure_url,
        });
      } catch (error) {
        console.error("Error uploading image:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        toast.error("Failed to upload image", {
          description: errorMessage,
        });
      } finally {
        setIsUploadingImage(false);
        // ✅ Clear input to allow re-uploading the same file
        event.target.value = "";
      }
    },
    [seatMap, setSeatMap]
  );

  const handleRemoveImage = useCallback(() => {
    if (!seatMap || !seatMap.image) {
      console.warn("⚠️ No image to remove");
      return;
    }

    setSeatMap({
      ...seatMap,
      image: "",
    });

    toast.success("Image removed", {
      description: "Seat map preview image has been removed",
    });
  }, [seatMap, setSeatMap]);

  // ✅ Show loading state while seat map is being fetched
  if (isLoading) {
    return (
      <div className="rounded-lg p-4 space-y-4 border border-gray-700">
        <h4 className="text-sm font-semibold border-b border-gray-700 pb-2">
          Seat Map Settings
        </h4>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-400">
            Loading seat map...
          </span>
        </div>
      </div>
    );
  }

  // ✅ Show message when seat map is not initialized
  if (!seatMap) {
    return (
      <div className="rounded-lg p-4 space-y-4 border border-gray-700">
        <h4 className="text-sm font-semibold border-b border-gray-700 pb-2">
          Seat Map Settings
        </h4>
        <div className="text-center py-8">
          <p className="text-sm text-gray-400">No seat map loaded</p>
          <p className="text-xs text-gray-500 mt-2">
            Please wait while the seat map is being initialized
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 border border-gray-700">
      <h4 className="text-sm font-semibold border-b border-gray-700 pb-2">
        Seat Map Settings
      </h4>

      {/* Seat Map Name */}
      <div>
        <Label htmlFor="seatMapName" className="text-xs text-gray-300">
          Seat Map Name
        </Label>
        <Input
          id="seatMapName"
          type="text"
          value={seatMapName}
          onChange={handleSeatMapNameChange}
          className="mt-1 bg-gray-700 border-gray-600 text-white text-xs"
          placeholder="Enter seat map name"
          disabled={isLoading}
          maxLength={200}
        />
        <p className="text-xs text-gray-400 mt-1">
          {seatMapName.length}/200 characters
        </p>
      </div>

      {/* Seat Map Image */}
      <div>
        <Label className="text-xs text-gray-300 mb-2 block">
          Seat Map Preview Image
        </Label>

        {seatMap.image && (
          <div className="mb-2 rounded overflow-hidden border border-gray-600 relative group">
            <img
              src={seatMap.image}
              alt="Seat map preview"
              className="w-full h-32 object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleRemoveImage}
                disabled={isUploadingImage}
              >
                Remove Image
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Input
            id="imageUpload"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={isUploadingImage || isLoading}
            className="hidden"
          />
          <div className="flex items-center justify-between">
            {isUploadingImage && (
              <div className="w-full mr-2">
                <div className="w-full bg-gray-600 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-blue-500 h-2.5 transition-all duration-500"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-400 mt-1">{uploadProgress}%</p>
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full bg-gray-600 hover:bg-gray-700 disabled:opacity-50"
            disabled={isUploadingImage || isLoading}
            onClick={() => document.getElementById("imageUpload")?.click()}
          >
            {isUploadingImage ? (
              <>
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <ImageIcon className="w-3 h-3 mr-2" />
                {seatMap.image ? "Change Image" : "Upload Image"}
              </>
            )}
          </Button>
          <p className="text-xs text-gray-400">
            Max size: 5MB • Formats: JPG, PNG, WebP
          </p>
        </div>
      </div>
    </div>
  );
};
