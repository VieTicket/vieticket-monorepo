import { Shape } from "@/types/seat-map-types";

export const createHitFunc = (shape: Shape) => {
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

// Fixed: Rectangle hit function
const createRectHitFunc = (shape: any) => {
  return (context: any, konvaShape?: any) => {
    const width = shape.width;
    const height = shape.height;
    const cornerRadius = shape.cornerRadius || 0;

    console.log("Rectangle hit function called:", {
      width,
      height,
      cornerRadius,
      context,
      konvaShape,
    });

    if (!context) {
      console.warn("No context provided to hit function");
      return;
    }

    try {
      context.beginPath();

      if (cornerRadius > 0) {
        // Rounded rectangle path
        const x = 0;
        const y = 0;
        const r = Math.min(cornerRadius, width / 2, height / 2);

        context.moveTo(x + r, y);
        context.lineTo(x + width - r, y);
        context.quadraticCurveTo(x + width, y, x + width, y + r);
        context.lineTo(x + width, y + height - r);
        context.quadraticCurveTo(
          x + width,
          y + height,
          x + width - r,
          y + height
        );
        context.lineTo(x + r, y + height);
        context.quadraticCurveTo(x, y + height, x, y + height - r);
        context.lineTo(x, y + r);
        context.quadraticCurveTo(x, y, x + r, y);
      } else {
        // Regular rectangle
        context.rect(0, 0, width, height);
      }

      context.closePath();

      // Use fillStrokeShape if available, otherwise use fill/stroke
      if (konvaShape && typeof konvaShape.fillStrokeShape === "function") {
        konvaShape.fillStrokeShape(context);
      } else {
        context.fill();
        if (shape.stroke) {
          context.stroke();
        }
      }

      console.log("Rectangle hit function completed successfully");
    } catch (error) {
      console.error("Error in rectangle hit function:", error);
    }
  };
};

// Fixed: Circle hit function
const createCircleHitFunc = (shape: any) => {
  return (context: any, konvaShape?: any) => {
    const radius = shape.radius;

    console.log("Circle hit function called:", { radius, context, konvaShape });

    if (!context) {
      console.warn("No context provided to circle hit function");
      return;
    }

    try {
      context.beginPath();
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.closePath();

      if (konvaShape && typeof konvaShape.fillStrokeShape === "function") {
        konvaShape.fillStrokeShape(context);
      } else {
        context.fill();
        if (shape.stroke) {
          context.stroke();
        }
      }

      console.log("Circle hit function completed successfully");
    } catch (error) {
      console.error("Error in circle hit function:", error);
    }
  };
};

// Fixed: Polygon hit function
const createPolygonHitFunc = (shape: any) => {
  return (context: any, konvaShape?: any) => {
    const points = shape.points;

    console.log("Polygon hit function called:", {
      points,
      context,
      konvaShape,
    });

    if (!context || !points || points.length < 6) {
      console.warn("Invalid context or points for polygon hit function");
      return;
    }

    try {
      context.beginPath();
      context.moveTo(points[0], points[1]);

      for (let i = 2; i < points.length; i += 2) {
        context.lineTo(points[i], points[i + 1]);
      }

      if (shape.closed !== false) {
        context.closePath();
      }

      if (konvaShape && typeof konvaShape.fillStrokeShape === "function") {
        konvaShape.fillStrokeShape(context);
      } else {
        context.fill();
        if (shape.stroke) {
          context.stroke();
        }
      }

      console.log("Polygon hit function completed successfully");
    } catch (error) {
      console.error("Error in polygon hit function:", error);
    }
  };
};

// Fixed: Text hit function
const createTextHitFunc = (shape: any) => {
  return (context: any, konvaShape?: any) => {
    const fontSize = shape.fontSize || 16;
    const text = shape.text || shape.name || "New Text";
    const width = shape.width || Math.max(100, text.length * fontSize * 0.6);
    const height = fontSize * 1.2;

    console.log("Text hit function called:", {
      width,
      height,
      text,
      context,
      konvaShape,
    });

    if (!context) {
      console.warn("No context provided to text hit function");
      return;
    }

    try {
      context.beginPath();
      context.rect(0, 0, width, height);
      context.closePath();

      if (konvaShape && typeof konvaShape.fillStrokeShape === "function") {
        konvaShape.fillStrokeShape(context);
      } else {
        context.fill();
        if (shape.stroke) {
          context.stroke();
        }
      }

      console.log("Text hit function completed successfully");
    } catch (error) {
      console.error("Error in text hit function:", error);
    }
  };
};
