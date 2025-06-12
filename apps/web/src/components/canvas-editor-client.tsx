"use client";

import { useEffect, useRef, useState } from "react";
import { Stage, Layer } from "react-konva";

export default function CanvasEditorClient() {
  const stageRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const handleResize = () => {
      const container = document.querySelector(".canvas-container");
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: container.clientHeight,
        });
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="canvas-container relative flex-1 bg-white">
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        className="absolute top-0 left-0"
      >
        <Layer>{/* shapes here */}</Layer>
      </Stage>
    </div>
  );
}
