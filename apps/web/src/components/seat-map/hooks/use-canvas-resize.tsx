import { useEffect } from "react";
import { useCanvasStore } from "@/components/seat-map/store/main-store";

export const useCanvasResize = () => {
  const { setCanvasSize } = useCanvasStore();

  useEffect(() => {
    const handleResize = () => {
      const container = document.querySelector(".canvas-container");
      if (container) {
        const availableHeight = window.innerHeight - 100;
        const availableWidth = container.clientWidth || window.innerWidth;
        console.log("Resizing canvas to: ", availableWidth, availableHeight);
        setCanvasSize(availableWidth, availableHeight);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setCanvasSize]);
};
