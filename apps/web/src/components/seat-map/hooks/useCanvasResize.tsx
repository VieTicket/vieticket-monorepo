import { useEffect, useRef } from "react";
import { useCanvasStore } from "@/components/seat-map/store/main-store";

export const useCanvasResize = () => {
  const { setCanvasSize, setViewportSize, zoom, pan } = useCanvasStore();
  const isInitialLoad = useRef(true);

  useEffect(() => {
    const handleResize = () => {
      const container = document.querySelector(".canvas-container");
      if (container) {
        const viewportWidth = container.clientWidth || window.innerWidth;
        const viewportHeight =
          container.clientHeight || window.innerHeight - 100;

        // Set viewport size (what user sees)
        setViewportSize(viewportWidth, viewportHeight);

        // Set canvas size (5x larger working area)
        const canvasWidth = viewportWidth * 5;
        const canvasHeight = viewportHeight * 5;

        console.log("Viewport size:", viewportWidth, viewportHeight);
        console.log("Canvas size:", canvasWidth, canvasHeight);

        setCanvasSize(canvasWidth, canvasHeight);

        // Only center on initial load, not on resize
        isInitialLoad.current = false;
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setCanvasSize, setViewportSize]); // Remove setBoundedPan from dependencies

  return { isInitialLoad: isInitialLoad.current };
};
