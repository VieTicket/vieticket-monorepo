import * as PIXI from "pixi.js";
import { CanvasItem, ImageShape } from "../types";
import { generateShapeId } from "../shapes";
import { getEventManager } from "../events/event-manager";
import { addShapeToStage } from "../shapes";
import { useSeatMapStore } from "../store/seat-map-store";
import { createSVG } from "../shapes/svg-shape";

// ✅ Collaboration support
export const importImageToCanvasWithCollaboration = async (
  file: File,
  userId: string,
  collaboration?: any // SeatMapCollaboration instance
): Promise<ImageShape> => {
  const uploadId = crypto.randomUUID();

  try {
    // 1. Create temporary shape with blob URL for immediate display
    const tempShape = await createTempImageShape(file, uploadId, userId);

    // 2. Add to store with uploading state (this will broadcast to other users)
    useSeatMapStore.getState().addShape(tempShape);

    // 3. Broadcast upload start to other users
    if (collaboration) {
      collaboration.broadcastImageUploadStart(tempShape);
    }

    // 4. Upload to Cloudinary in background
    try {
      const cloudinaryUrl = await uploadToCloudinary(file, uploadId);

      // 5. Update shape with final URL
      const updatedShape: ImageShape = {
        ...tempShape,
        src: cloudinaryUrl,
        uploadState: "uploaded",
        cloudinaryUrl,
        uploadedAt: new Date(),
      };

      // Clean up blob URL
      if (tempShape.tempBlobUrl) {
        URL.revokeObjectURL(tempShape.tempBlobUrl);
      }

      // Update in store
      useSeatMapStore.getState().modifyShapes([updatedShape]);

      // Broadcast completion
      if (collaboration) {
        collaboration.broadcastImageUploadComplete(tempShape.id, cloudinaryUrl);
      }

      return updatedShape;
    } catch (uploadError) {
      console.error("Failed to upload image:", uploadError);

      // Update state to failed
      const failedShape: ImageShape = {
        ...tempShape,
        uploadState: "failed",
      };

      useSeatMapStore.getState().modifyShapes([failedShape]);

      // Broadcast failure
      if (collaboration) {
        collaboration.broadcastImageUploadFailed(tempShape.id);
      }

      throw uploadError;
    }
  } catch (error) {
    console.error("Failed to import image:", error);
    throw error;
  }
};

const createTempImageShape = async (
  file: File,
  uploadId: string,
  userId: string
): Promise<ImageShape> => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = async () => {
      try {
        // Create blob URL for immediate display
        const blobUrl = URL.createObjectURL(file);

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        ctx.drawImage(img, 0, 0);

        const texture = PIXI.Texture.from(canvas);
        const sprite = new PIXI.Sprite(texture);

        const originalWidth = canvas.width;
        const originalHeight = canvas.height;

        const maxSize = 800;
        let scaleX = 1;
        let scaleY = 1;

        if (originalWidth > maxSize || originalHeight > maxSize) {
          const scaleRatio = Math.min(
            maxSize / originalWidth,
            maxSize / originalHeight
          );
          scaleX = scaleRatio;
          scaleY = scaleRatio;
        }

        sprite.anchor.set(0.5, 0.5);
        const centerX = 400;
        const centerY = 300;
        sprite.position.set(centerX, centerY);
        sprite.scale.set(scaleX, scaleY);
        sprite.eventMode = "static";
        sprite.cursor = "pointer";

        const imageShape: ImageShape = {
          id: generateShapeId(),
          name: `Image: ${file.name}`,
          type: "image",
          graphics: sprite,
          x: centerX,
          y: centerY,
          src: blobUrl, // Temporary blob URL
          tempBlobUrl: blobUrl,
          originalWidth,
          originalHeight,
          scaleX,
          scaleY,
          rotation: 0,
          opacity: 1,
          visible: true,
          interactive: true,
          selected: false,
          uploadState: "uploading",
          uploadId,
          uploadedBy: userId,
          uploadedAt: new Date(),
        };

        const eventManager = getEventManager();
        if (eventManager) {
          eventManager.addShapeEvents(imageShape);
        }

        resolve(imageShape);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    const objectURL = URL.createObjectURL(file);
    img.src = objectURL;
  });
};

// ✅ Cloudinary upload function
export const uploadToCloudinary = async (
  file: File,
  uploadId?: string
): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append(
    "upload_preset",
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "default"
  );
  formData.append("folder", "seat-maps");

  if (uploadId) {
    formData.append("public_id", uploadId);
  }

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.secure_url;
};

// ✅ Legacy function for non-collaborative mode
export const importImageToCanvas = async (file: File): Promise<CanvasItem> => {
  try {
    if (file.type === "image/svg+xml") {
      return await importSVGToCanvas(file);
    } else {
      return await importImageAsSprite(file);
    }
  } catch (error) {
    console.error("Failed to import file:", error);
    throw new Error(
      "Failed to import file. Please check the file format and try again."
    );
  }
};

const importImageAsSprite = async (file: File): Promise<ImageShape> => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = async () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        ctx.drawImage(img, 0, 0);

        const texture = PIXI.Texture.from(canvas);
        URL.revokeObjectURL(img.src);

        const sprite = new PIXI.Sprite(texture);
        const originalWidth = canvas.width;
        const originalHeight = canvas.height;

        const maxSize = 800;
        let scaleX = 1;
        let scaleY = 1;

        if (originalWidth > maxSize || originalHeight > maxSize) {
          const scaleRatio = Math.min(
            maxSize / originalWidth,
            maxSize / originalHeight
          );
          scaleX = scaleRatio;
          scaleY = scaleRatio;
        }

        sprite.anchor.set(0.5, 0.5);
        const centerX = 400;
        const centerY = 300;
        sprite.position.set(centerX, centerY);
        sprite.scale.set(scaleX, scaleY);
        sprite.eventMode = "static";
        sprite.cursor = "pointer";

        const imageShape: ImageShape = {
          id: generateShapeId(),
          name: `Image: ${file.name}`,
          type: "image",
          graphics: sprite,
          x: centerX,
          y: centerY,
          src: file.name,
          originalWidth,
          originalHeight,
          scaleX,
          scaleY,
          rotation: 0,
          opacity: 1,
          visible: true,
          interactive: true,
          selected: false,
          uploadState: "uploaded", // Default to uploaded for non-collaborative mode
        };

        const eventManager = getEventManager();
        if (eventManager) {
          eventManager.addShapeEvents(imageShape);
        }

        addShapeToStage(imageShape);
        useSeatMapStore.getState().setSelectedShapes([imageShape], true);

        resolve(imageShape);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Failed to load image"));
    };

    const objectURL = URL.createObjectURL(file);
    img.src = objectURL;
  });
};

const importSVGToCanvas = async (file: File): Promise<CanvasItem> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const svgContent = event.target?.result as string;

        const cleanSvgContent = svgContent
          .replace(/<\?xml[^>]*\?>/g, "")
          .replace(/<!DOCTYPE[^>]*>/g, "")
          .trim();

        const centerX = 400;
        const centerY = 300;

        const svgShape = createSVG(
          centerX,
          centerY,
          cleanSvgContent,
          `SVG: ${file.name}`
        );

        const maxSize = 400;
        if (
          svgShape.originalWidth > maxSize ||
          svgShape.originalHeight > maxSize
        ) {
          const scaleRatio = Math.min(
            maxSize / svgShape.originalWidth,
            maxSize / svgShape.originalHeight
          );
          svgShape.scaleX = scaleRatio;
          svgShape.scaleY = scaleRatio;
          svgShape.graphics.scale.set(scaleRatio, scaleRatio);
        }

        addShapeToStage(svgShape);
        useSeatMapStore.getState().setSelectedShapes([svgShape], true);

        resolve(svgShape);
      } catch (error) {
        reject(new Error(`Failed to parse SVG: ${error}`));
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read SVG file"));
    };

    reader.readAsText(file);
  });
};
