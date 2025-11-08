/**
 * Captures the seat map canvas as an optimized image blob
 * @param app PIXI Application instance
 * @param shapes Array of shapes for context (not used in capture but for validation)
 * @returns Promise<Blob> - The captured image as a blob
 */
export const captureSeatMapImageOptimized = async (
  app: any,
  shapes: any[]
): Promise<Blob> => {
  if (!app || !app.stage) {
    throw new Error("PIXI application or stage not available");
  }

  try {
    // Create a temporary canvas for capturing
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Unable to get canvas context");
    }

    // Set canvas size (you can adjust these dimensions as needed)
    const width = 1200;
    const height = 800;
    canvas.width = width;
    canvas.height = height;

    // Fill with white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // Extract the image from PIXI app
    const tempCanvas = app.renderer.extract.canvas(app.stage);

    // Draw the PIXI stage onto our canvas
    ctx.drawImage(tempCanvas, 0, 0, width, height);

    // Convert to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to create blob from canvas"));
          }
        },
        "image/png",
        0.9
      );
    });
  } catch (error) {
    console.error("Error capturing seat map image:", error);
    throw new Error("Failed to capture seat map image");
  }
};
