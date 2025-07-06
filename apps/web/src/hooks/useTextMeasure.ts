import { useCallback, useMemo } from "react";

export const useTextMeasure = () => {
  const canvas = useMemo(() => {
    if (typeof window === "undefined") return null;
    return document.createElement("canvas");
  }, []);

  const measureText = useCallback(
    (
      text: string,
      fontSize: number = 16,
      fontFamily: string = "Arial",
      fontStyle: string = "normal"
    ) => {
      if (!canvas) return { width: 200, height: 24 };

      const context = canvas.getContext("2d");
      if (!context) return { width: 200, height: 24 };

      // Set font properties
      context.font = `${fontStyle} ${fontSize}px ${fontFamily}`;

      // Split text by lines (for multi-line support)
      const lines = text.split("\n");

      // Measure each line and find the maximum width
      let maxWidth = 0;
      for (const line of lines) {
        const metrics = context.measureText(line);
        maxWidth = Math.max(maxWidth, metrics.width);
      }

      // Calculate total height
      const totalHeight = lines.length;

      return {
        width: Math.max(maxWidth + 10, 50), // Add padding and minimum width
        height: Math.max(totalHeight, fontSize),
      };
    },
    [canvas]
  );

  return { measureText };
};
