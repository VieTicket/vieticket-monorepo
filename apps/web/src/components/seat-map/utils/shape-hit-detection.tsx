import { Shape, AreaShape } from "@/types/seat-map-types";

export const createHitFunc = (shape: Shape | AreaShape) => {
  switch (shape.type) {
    case "rect":
      return createRectHitFunc(shape);
    case "circle":
      return createCircleHitFunc(shape);
    case "polygon":
      return createPolygonHitFunc(shape);
    case "text":
      return createTextHitFunc(shape);
    default:
      return undefined;
  }
};

// FIXED: Rectangle hit function for both Shape and AreaShape
const createRectHitFunc = (shape: any) => {
  return (context: any, shapeNode: any) => {
    // FIXED: Handle both regular shapes and area shapes
    const w = shape.width || shapeNode.width() || 20;
    const h = shape.height || shapeNode.height() || 20;
    const r = shape.cornerRadius || 0;

    context.beginPath();

    if (r > 0) {
      context.moveTo(r, 0);
      context.lineTo(w - r, 0);
      context.quadraticCurveTo(w, 0, w, r);
      context.lineTo(w, h - r);
      context.quadraticCurveTo(w, h, w - r, h);
      context.lineTo(r, h);
      context.quadraticCurveTo(0, h, 0, h - r);
      context.lineTo(0, r);
      context.quadraticCurveTo(0, 0, r, 0);
    } else {
      context.rect(0, 0, w, h);
    }

    context.closePath();
    context.fillStrokeShape(shapeNode);
  };
};

// Fixed: Circle hit function
const createCircleHitFunc = (shape: any) => {
  return (context: any, shapeNode?: any) => {
    const radius = shape.radius || 10;
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.closePath();
    context.fillStrokeShape(shapeNode);
  };
};

// Fixed: Polygon hit function
const createPolygonHitFunc = (shape: any) => {
  return (context: any, shapeNode?: any) => {
    const points = shape.points;
    if (!points || points.length < 2) return; // FIX: Need at least 2 points

    context.beginPath();
    // FIX: Handle 2D points array
    context.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      context.lineTo(points[i].x, points[i].y);
    }

    if (shape.closed !== false) {
      context.closePath();
    }

    context.fillStrokeShape(shapeNode);
  };
};

// Fixed: Text hit function
const createTextHitFunc = (shape: any) => {
  return (context: any, shapeNode?: any) => {
    const fontSize = shape.fontSize || 16;
    const text = shape.text || shape.name || "New Text";
    const width = shape.width || Math.max(100, text.length * fontSize * 0.6);
    const height = fontSize * 1.2;

    context.beginPath();
    context.rect(0, 0, width, height);
    context.closePath();
    context.fillStrokeShape(shapeNode);
  };
};
