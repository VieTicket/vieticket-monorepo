import { useCallback, useRef } from "react";
import { useCanvasStore } from "@/components/seat-map/store/main-store";

export const usePanZoom = () => {
  const { zoom, pan, setZoom, setPan, viewportSize, canvasSize } =
    useCanvasStore();
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const isDragginCanvas = useRef(false);

  const clampPan = useCallback(
    (x: number, y: number, currentZoom: number = zoom) => {
      const { width: viewportWidth, height: viewportHeight } = viewportSize;
      const { width: canvasWidth, height: canvasHeight } = canvasSize;

      // Calculate the scaled canvas dimensions
      const scaledCanvasWidth = canvasWidth * currentZoom;
      const scaledCanvasHeight = canvasHeight * currentZoom;

      // Calculate bounds
      const minX = viewportWidth - scaledCanvasWidth;
      const maxX = 0;
      const minY = viewportHeight - scaledCanvasHeight;
      const maxY = 0;

      // Clamp the values
      const clampedX = Math.max(minX, Math.min(maxX, x));
      const clampedY = Math.max(minY, Math.min(maxY, y));

      return { x: clampedX, y: clampedY };
    },
    [zoom, viewportSize, canvasSize]
  );

  // Updated setPan wrapper that applies bounds
  const setBoundedPan = useCallback(
    (x: number, y: number, currentZoom: number = zoom) => {
      const bounded = clampPan(x, y, currentZoom);
      setPan(bounded.x, bounded.y);
    },
    [clampPan, setPan, zoom]
  );

  const centerCanvas = useCallback(() => {
    if (viewportSize && canvasSize) {
      // Center the canvas in the viewport
      const centerX = (viewportSize.width - canvasSize.width) / 2;
      const centerY = (viewportSize.height - canvasSize.height) / 2;

      setBoundedPan(centerX, centerY, 1);
      setZoom(1);
    }
  }, [viewportSize, canvasSize, setBoundedPan, setZoom]);

  const handleWheel = useCallback(
    (e: any) => {
      e.evt.preventDefault();

      const stage = e.target.getStage();
      const pointer = stage.getPointerPosition();

      const deltaX = e.evt.deltaX;
      const deltaY = e.evt.deltaY;
      const ctrlPressed = e.evt.ctrlKey || e.evt.metaKey;
      const shiftPressed = e.evt.shiftKey;

      const isTouchpad =
        Math.abs(deltaX) > 0 ||
        (Math.abs(deltaY) < 50 && Math.abs(deltaX) < 50);

      if (isTouchpad) {
        handleTouchpad(deltaX, deltaY, ctrlPressed, pointer);
      } else {
        if (ctrlPressed) {
          handleZoom(deltaY, pointer);
        } else if (shiftPressed) {
          handleHorizontalPan(deltaY);
        } else {
          handleVerticalPan(deltaY);
        }
      }
    },
    [zoom, pan, setZoom, setPan]
  );

  const handleTouchpad = useCallback(
    (deltaX: number, deltaY: number, ctrlPressed: boolean, pointer: any) => {
      if (ctrlPressed) {
        handleZoom(deltaY, pointer);
      } else {
        const panSpeed = 1;
        const newX = pan.x - deltaX * panSpeed;
        const newY = pan.y - deltaY * panSpeed;
        setBoundedPan(newX, newY); // Use setBoundedPan instead of setPan
      }
    },
    [pan, setBoundedPan, zoom, setZoom] // Update dependencies
  );

  const handleZoom = useCallback(
    (deltaY: number, pointer: any) => {
      const scaleBy = 1.1;
      const oldScale = zoom;
      const newScale = deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;

      const clampedScale = Math.max(0.1, Math.min(5, newScale));

      if (clampedScale !== oldScale) {
        const mousePointTo = {
          x: (pointer.x - pan.x) / oldScale,
          y: (pointer.y - pan.y) / oldScale,
        };

        const newPos = {
          x: pointer.x - mousePointTo.x * clampedScale,
          y: pointer.y - mousePointTo.y * clampedScale,
        };

        setZoom(clampedScale);
        setPan(newPos.x, newPos.y);
      }
    },
    [zoom, pan, setZoom, setPan]
  );

  const handleHorizontalPan = useCallback(
    (deltaY: number) => {
      const panSpeed = 2;
      const newPanX = pan.x - (deltaY > 0 ? panSpeed : -panSpeed) * 20;
      setBoundedPan(newPanX, pan.y); // Use setBoundedPan instead of setPan
    },
    [pan, setBoundedPan] // Update dependencies
  );

  const handleVerticalPan = useCallback(
    (deltaY: number) => {
      const panSpeed = 2;
      const newPanY = pan.y - (deltaY > 0 ? panSpeed : -panSpeed) * 20;
      setBoundedPan(pan.x, newPanY); // Use setBoundedPan instead of setPan
    },
    [pan, setBoundedPan] // Update dependencies
  );

  const handleMouseDown = useCallback(
    (e: any) => {
      if (
        e.evt.button === 1 ||
        (e.evt.button === 0 && e.evt.spaceKey) ||
        e.evt.button === 2
      ) {
        e.evt.preventDefault();
        const stage = e.target.getStage();
        const pos = stage.getPointerPosition();
        dragStartPos.current = { x: pos.x - pan.x, y: pos.y - pan.y };
        isDragginCanvas.current = true;
        stage.container().style.cursor = "grabbing";
      }
    },
    [pan]
  );

  const handleMouseMove = useCallback(
    (e: any) => {
      if (!isDragginCanvas.current || !dragStartPos.current) return;

      const stage = e.target.getStage();
      const pos = stage.getPointerPosition();

      const newX = pos.x - dragStartPos.current.x;
      const newY = pos.y - dragStartPos.current.y;

      setBoundedPan(newX, newY); // Use setBoundedPan instead of setPan
    },
    [setBoundedPan] // Update dependencies
  );
  const handleMouseUp = useCallback((e: any) => {
    isDragginCanvas.current = false;
    dragStartPos.current = null;
    const stage = e.target.getStage();
    stage.container().style.cursor = "default";
  }, []);

  const fitToScreen = useCallback(() => {
    if (viewportSize && canvasSize) {
      const scaleX = viewportSize.width / canvasSize.width;
      const scaleY = viewportSize.height / canvasSize.height;
      const newZoom = Math.min(scaleX, scaleY, 1);

      setZoom(newZoom);

      const centerX = (viewportSize.width - canvasSize.width * newZoom) / 2;
      const centerY = (viewportSize.height - canvasSize.height * newZoom) / 2;
      setBoundedPan(centerX, centerY, newZoom);
    }
  }, [viewportSize, canvasSize, setZoom, setBoundedPan]);

  const zoomIn = useCallback(() => {
    const newZoom = Math.min(5, zoom * 1.2);
    setZoom(newZoom);
    // Ensure pan stays within bounds after zoom
    setBoundedPan(pan.x, pan.y, newZoom);
  }, [zoom, pan, setZoom, setBoundedPan]);

  const zoomOut = useCallback(() => {
    const newZoom = Math.max(0.1, zoom / 1.2);
    setZoom(newZoom);
    // Ensure pan stays within bounds after zoom
    setBoundedPan(pan.x, pan.y, newZoom);
  }, [zoom, pan, setZoom, setBoundedPan]);

  return {
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    setBoundedPan,
    centerCanvas,
    fitToScreen,
    zoomIn,
    zoomOut,
  };
};
