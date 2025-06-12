"use client";
import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Circle, Text } from "react-konva";

export default function CanvasKonva() {
  const stageRef = useRef(null);
  const [size, setSize] = useState({ w: 300, h: 200 });

  useEffect(() => {
    const onResize = () => {
      setSize({
        w: window.innerWidth,
        h: window.innerHeight / 2,
      });
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <Stage width={size.w} height={size.h} ref={stageRef}>
      <Layer>
        <Text text="Drag me!" x={20} y={20} fontSize={18} />
        <Rect x={50} y={60} width={100} height={80} fill="red" draggable />
        <Circle x={200} y={100} radius={40} fill="green" draggable />
      </Layer>
    </Stage>
  );
}
