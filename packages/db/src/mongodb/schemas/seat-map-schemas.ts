import {
  DocumentType,
  getModelForClass,
  index,
  pre,
  prop,
} from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import mongoose from "mongoose";
import { CanvasItem } from "../models/seat-map-models";

@pre<SeatMapClass>("save", function () {
  this.updatedAt = new Date();
  if (!this.createdAt) {
    this.createdAt = new Date();
  }
})
@index({ name: 1 })
@index({ createdAt: 1 })
@index({ createdBy: 1 })
@index({ publicity: 1 })
@index({ draftedFrom: 1 })
export class SeatMapClass extends TimeStamps {
  @prop({
    required: [true, "Name is required"],
    trim: true,
    minlength: [1, "Name must be at least 1 character after trimming"],
    maxlength: [100, "Name cannot exceed 100 characters"],
  })
  public name!: string;

  @prop({
    required: [true, "Shapes array is required"],
    type: () => [Object],
    validate: {
      validator: function (shapes: CanvasItem[]): boolean {
        if (!Array.isArray(shapes)) return false;

        return shapes.every((shape) => {
          if (!shape || typeof shape !== "object") return false;

          // Check required base properties for all canvas items
          const hasBaseProps =
            typeof shape.id === "string" &&
            shape.id.length > 0 &&
            typeof shape.name === "string" &&
            typeof shape.type === "string" &&
            typeof shape.visible === "boolean" &&
            typeof shape.interactive === "boolean" &&
            typeof shape.x === "number" &&
            typeof shape.y === "number" &&
            typeof shape.rotation === "number" &&
            typeof shape.scaleX === "number" &&
            typeof shape.scaleY === "number" &&
            typeof shape.opacity === "number" &&
            shape.opacity >= 0 &&
            shape.opacity <= 1;

          if (!hasBaseProps) return false;

          // ✅ Updated valid types to include new shape types
          const validTypes = [
            "rectangle",
            "ellipse",
            "text",
            "polygon",
            "image",
            "svg",
            "container",
            "freeshape", // ✅ Added freeshape support
          ];

          if (!validTypes.includes(shape.type)) return false;

          // ✅ Enhanced type-specific validation
          switch (shape.type) {
            case "rectangle":
              const rect = shape as any;
              return (
                typeof rect.width === "number" &&
                rect.width >= 0 &&
                typeof rect.height === "number" &&
                rect.height >= 0 &&
                typeof rect.cornerRadius === "number" &&
                rect.cornerRadius >= 0 &&
                typeof rect.color === "number" &&
                typeof rect.strokeColor === "number" &&
                typeof rect.strokeWidth === "number" &&
                rect.strokeWidth >= 0
              );

            case "ellipse":
              const ellipse = shape as any;
              const hasEllipseProps =
                typeof ellipse.radiusX === "number" &&
                ellipse.radiusX >= 0 &&
                typeof ellipse.radiusY === "number" &&
                ellipse.radiusY >= 0 &&
                typeof ellipse.color === "number" &&
                typeof ellipse.strokeColor === "number" &&
                typeof ellipse.strokeWidth === "number" &&
                ellipse.strokeWidth >= 0;

              if (!hasEllipseProps) return false;

              // ✅ Additional validation for SeatShape
              if (ellipse.rowId && ellipse.gridId) {
                return (
                  typeof ellipse.rowId === "string" &&
                  ellipse.rowId.length > 0 &&
                  typeof ellipse.gridId === "string" &&
                  ellipse.gridId.length > 0 &&
                  typeof ellipse.showLabel === "boolean" &&
                  ellipse.labelStyle &&
                  typeof ellipse.labelStyle === "object" &&
                  typeof ellipse.labelStyle.fontFamily === "string" &&
                  typeof ellipse.labelStyle.fontSize === "number" &&
                  ellipse.labelStyle.fontSize > 0 &&
                  typeof ellipse.labelStyle.fontWeight === "string" &&
                  typeof ellipse.labelStyle.align === "string"
                );
              }

              return true;

            case "text":
              const text = shape as any;
              return (
                typeof text.text === "string" &&
                typeof text.fontSize === "number" &&
                text.fontSize > 0 &&
                typeof text.fontFamily === "string" &&
                text.fontFamily.length > 0 &&
                typeof text.color === "number" &&
                ["normal", "bold"].includes(text.fontWeight) &&
                ["left", "center", "right"].includes(text.textAlign)
              );

            case "polygon":
              const polygon = shape as any;
              return (
                Array.isArray(polygon.points) &&
                polygon.points.length >= 3 &&
                polygon.points.every(
                  (point: any) =>
                    typeof point.x === "number" &&
                    typeof point.y === "number" &&
                    (point.radius === undefined ||
                      typeof point.radius === "number")
                ) &&
                typeof polygon.cornerRadius === "number" &&
                polygon.cornerRadius >= 0 &&
                typeof polygon.color === "number" &&
                typeof polygon.strokeColor === "number" &&
                typeof polygon.strokeWidth === "number" &&
                polygon.strokeWidth >= 0
              );

            case "image":
              const image = shape as any;
              return (
                typeof image.src === "string" &&
                image.src.length > 0 &&
                typeof image.originalWidth === "number" &&
                image.originalWidth > 0 &&
                typeof image.originalHeight === "number" &&
                image.originalHeight > 0 &&
                (!image.uploadState ||
                  ["uploading", "uploaded", "failed"].includes(
                    image.uploadState
                  ))
              );

            case "svg":
              const svg = shape as any;
              return (
                typeof svg.svgContent === "string" &&
                svg.svgContent.length > 0 &&
                typeof svg.originalWidth === "number" &&
                svg.originalWidth > 0 &&
                typeof svg.originalHeight === "number" &&
                svg.originalHeight > 0
              );

            // ✅ Enhanced freeshape validation
            case "freeshape":
              const freeshape = shape as any;
              return (
                Array.isArray(freeshape.points) &&
                freeshape.points.length >= 2 &&
                freeshape.points.every(
                  (point: any) =>
                    typeof point.x === "number" &&
                    typeof point.y === "number" &&
                    ["move", "curve", "line"].includes(point.type) &&
                    (point.cp1x === undefined ||
                      typeof point.cp1x === "number") &&
                    (point.cp1y === undefined ||
                      typeof point.cp1y === "number") &&
                    (point.cp2x === undefined ||
                      typeof point.cp2x === "number") &&
                    (point.cp2y === undefined ||
                      typeof point.cp2y === "number") &&
                    (point.smoothness === undefined ||
                      typeof point.smoothness === "number")
                ) &&
                typeof freeshape.closed === "boolean" &&
                typeof freeshape.color === "number" &&
                typeof freeshape.strokeColor === "number" &&
                typeof freeshape.strokeWidth === "number" &&
                freeshape.strokeWidth >= 0 &&
                typeof freeshape.smoothness === "number"
              );

            case "container":
              const container = shape as any;
              const hasContainerProps =
                Array.isArray(container.children) &&
                typeof container.expanded === "boolean";

              if (!hasContainerProps) return false;

              // ✅ Enhanced validation for specific container types

              // AreaModeContainer validation
              if (container.defaultSeatSettings) {
                const hasAreaModeProps =
                  typeof container.defaultSeatSettings === "object" &&
                  typeof container.defaultSeatSettings.seatSpacing ===
                    "number" &&
                  container.defaultSeatSettings.seatSpacing >= 0 &&
                  typeof container.defaultSeatSettings.rowSpacing ===
                    "number" &&
                  container.defaultSeatSettings.rowSpacing >= 0 &&
                  typeof container.defaultSeatSettings.seatRadius ===
                    "number" &&
                  container.defaultSeatSettings.seatRadius > 0 &&
                  typeof container.defaultSeatSettings.seatColor === "number" &&
                  typeof container.defaultSeatSettings.seatStrokeColor ===
                    "number" &&
                  typeof container.defaultSeatSettings.seatStrokeWidth ===
                    "number" &&
                  container.defaultSeatSettings.seatStrokeWidth >= 0 &&
                  typeof container.defaultSeatSettings.price === "number" &&
                  container.defaultSeatSettings.price >= 0;

                if (!hasAreaModeProps) return false;

                // Validate that children are GridShapes
                return container.children.every(
                  (child: any) =>
                    child.type === "container" &&
                    child.gridName &&
                    typeof child.gridName === "string"
                );
              }

              // GridShape validation
              if (container.gridName) {
                const hasGridProps =
                  typeof container.gridName === "string" &&
                  container.gridName.length > 0 &&
                  typeof container.seatSettings === "object" &&
                  typeof container.seatSettings.seatSpacing === "number" &&
                  container.seatSettings.seatSpacing >= 0 &&
                  typeof container.seatSettings.rowSpacing === "number" &&
                  container.seatSettings.rowSpacing >= 0 &&
                  typeof container.seatSettings.seatRadius === "number" &&
                  container.seatSettings.seatRadius > 0 &&
                  typeof container.seatSettings.seatColor === "number" &&
                  typeof container.seatSettings.seatStrokeColor === "number" &&
                  typeof container.seatSettings.seatStrokeWidth === "number" &&
                  container.seatSettings.seatStrokeWidth >= 0 &&
                  typeof container.seatSettings.price === "number" &&
                  container.seatSettings.price >= 0 &&
                  container.createdAt instanceof Date;

                if (!hasGridProps) return false;

                // Validate that children are RowShapes
                return container.children.every(
                  (child: any) =>
                    child.type === "container" &&
                    child.rowName &&
                    typeof child.rowName === "string" &&
                    child.gridId === container.id
                );
              }

              // RowShape validation
              if (container.rowName && !container.gridName) {
                const hasRowProps =
                  typeof container.rowName === "string" &&
                  container.rowName.length > 0 &&
                  typeof container.seatSpacing === "number" &&
                  container.seatSpacing >= 0 &&
                  typeof container.gridId === "string" &&
                  container.gridId.length > 0 &&
                  ["left", "middle", "right", "none"].includes(
                    container.labelPlacement
                  ) &&
                  container.createdAt instanceof Date;

                if (!hasRowProps) return false;

                // Validate that children are SeatShapes
                return container.children.every(
                  (child: any) =>
                    child.type === "ellipse" &&
                    child.rowId === container.id &&
                    child.gridId === container.gridId &&
                    typeof child.rowId === "string" &&
                    typeof child.gridId === "string"
                );
              }

              // ✅ Recursively validate children for regular containers
              return container.children.every(
                (child: any) =>
                  validateCanvasItem(child) && validateShapesByType(child)
              );

            default:
              return false;
          }
        });
      },
      message:
        "Invalid shapes array: All shapes must be valid canvas items with required properties",
    },
  })
  public shapes!: CanvasItem[];

  @prop({
    required: [true, "Image URL is required"],
    validate: {
      validator: function (value: string): boolean {
        if (typeof value !== "string" || value.trim().length === 0) {
          return false;
        }

        try {
          const url = new URL(value);
          return ["http:", "https:", "data:"].includes(url.protocol);
        } catch {
          return false;
        }
      },
      message:
        "Invalid URL format for image. Must be a valid HTTP, HTTPS, or data URL",
    },
  })
  public image!: string;

  @prop({
    required: [true, "Creator ID is required"],
    type: String,
    validate: {
      validator: function (value: string): boolean {
        return typeof value === "string" && value.trim().length > 0;
      },
      message: "Creator ID must be a non-empty string",
    },
  })
  public createdBy!: string;

  @prop({
    required: [true, "Publicity setting is required"],
    enum: ["public", "private"],
    default: "private",
    validate: {
      validator: function (value: string): boolean {
        return ["public", "private"].includes(value);
      },
      message: 'Publicity must be either "public" or "private"',
    },
  })
  public publicity!: "public" | "private";

  @prop({
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: "SeatMapClass",
    validate: {
      validator: async function (
        value: mongoose.Types.ObjectId | null
      ): Promise<boolean> {
        if (!value) return true;

        try {
          const SeatMapModel =
            mongoose.models.SeatMapClass ||
            mongoose.model("SeatMapClass", this.constructor.schema);

          const originalSeatMap = await SeatMapModel.findById(value);
          if (!originalSeatMap) return false;

          return originalSeatMap.publicity === "public";
        } catch (error) {
          console.error("Error validating draftedFrom:", error);
          return false;
        }
      },
      message: "Can only draft from existing public seat maps",
    },
  })
  public draftedFrom?: mongoose.Types.ObjectId;

  @prop({
    required: false,
    type: String,
    validate: {
      validator: function (value: string | undefined): boolean {
        if (!value) return true;
        return typeof value === "string" && value.trim().length > 0;
      },
      message: "Original creator ID must be a non-empty string if provided",
    },
  })
  public originalCreator?: string;

  public createdAt!: Date;
  public updatedAt!: Date;
}

export const SeatMapModel =
  mongoose.models.SeatMapClass ||
  getModelForClass(SeatMapClass, {
    schemaOptions: {
      collection: "seatmaps",
      timestamps: true,
      toJSON: {
        transform: (doc: any, ret: any) => {
          ret.id = ret._id.toString();
          delete ret._id;
          delete ret.__v;

          if (ret.createdAt) ret.createdAt = ret.createdAt.toISOString();
          if (ret.updatedAt) ret.updatedAt = ret.updatedAt.toISOString();
          if (ret.draftedFrom) ret.draftedFrom = ret.draftedFrom.toString();

          return ret;
        },
      },
      toObject: {
        transform: (doc: any, ret: any) => {
          ret.id = ret._id.toString();
          delete ret._id;
          delete ret.__v;

          if (ret.draftedFrom) ret.draftedFrom = ret.draftedFrom.toString();

          return ret;
        },
      },
      validateBeforeSave: true,
      strict: true,
      strictQuery: false,
    },
  });

export type SeatMapDocument = DocumentType<SeatMapClass>;

// ✅ Enhanced helper functions for shape validation
export const validateCanvasItem = (shape: any): boolean => {
  if (!shape || typeof shape !== "object") return false;

  const hasBaseProps =
    typeof shape.id === "string" &&
    shape.id.length > 0 &&
    typeof shape.name === "string" &&
    typeof shape.type === "string" &&
    typeof shape.visible === "boolean" &&
    typeof shape.interactive === "boolean" &&
    typeof shape.x === "number" &&
    typeof shape.y === "number" &&
    typeof shape.rotation === "number" &&
    typeof shape.scaleX === "number" &&
    typeof shape.scaleY === "number" &&
    typeof shape.opacity === "number" &&
    shape.opacity >= 0 &&
    shape.opacity <= 1;

  return hasBaseProps;
};

export const validateShapesByType = (shape: any): boolean => {
  const validTypes = [
    "rectangle",
    "ellipse",
    "text",
    "polygon",
    "image",
    "svg",
    "container",
    "freeshape", // ✅ Added freeshape
  ];

  if (!validTypes.includes(shape.type)) return false;

  switch (shape.type) {
    case "rectangle":
      return (
        typeof shape.width === "number" &&
        shape.width >= 0 &&
        typeof shape.height === "number" &&
        shape.height >= 0 &&
        typeof shape.cornerRadius === "number" &&
        shape.cornerRadius >= 0 &&
        typeof shape.color === "number" &&
        typeof shape.strokeColor === "number" &&
        typeof shape.strokeWidth === "number" &&
        shape.strokeWidth >= 0
      );

    case "ellipse":
      const hasEllipseProps =
        typeof shape.radiusX === "number" &&
        shape.radiusX >= 0 &&
        typeof shape.radiusY === "number" &&
        shape.radiusY >= 0 &&
        typeof shape.color === "number" &&
        typeof shape.strokeColor === "number" &&
        typeof shape.strokeWidth === "number" &&
        shape.strokeWidth >= 0;

      if (!hasEllipseProps) return false;

      // ✅ Validate SeatShape properties if present
      if (shape.rowId && shape.gridId) {
        return (
          typeof shape.rowId === "string" &&
          shape.rowId.length > 0 &&
          typeof shape.gridId === "string" &&
          shape.gridId.length > 0 &&
          typeof shape.showLabel === "boolean" &&
          shape.labelStyle &&
          typeof shape.labelStyle === "object"
        );
      }

      return true;

    case "text":
      return (
        typeof shape.text === "string" &&
        typeof shape.fontSize === "number" &&
        shape.fontSize > 0 &&
        typeof shape.fontFamily === "string" &&
        shape.fontFamily.length > 0 &&
        typeof shape.color === "number" &&
        ["normal", "bold"].includes(shape.fontWeight) &&
        ["left", "center", "right"].includes(shape.textAlign)
      );

    case "polygon":
      return (
        Array.isArray(shape.points) &&
        shape.points.length >= 3 &&
        shape.points.every(
          (point: any) =>
            typeof point.x === "number" &&
            typeof point.y === "number" &&
            (point.radius === undefined || typeof point.radius === "number")
        ) &&
        typeof shape.cornerRadius === "number" &&
        shape.cornerRadius >= 0 &&
        typeof shape.color === "number" &&
        typeof shape.strokeColor === "number" &&
        typeof shape.strokeWidth === "number" &&
        shape.strokeWidth >= 0
      );

    case "image":
      return (
        typeof shape.src === "string" &&
        shape.src.length > 0 &&
        typeof shape.originalWidth === "number" &&
        shape.originalWidth > 0 &&
        typeof shape.originalHeight === "number" &&
        shape.originalHeight > 0 &&
        (!shape.uploadState ||
          ["uploading", "uploaded", "failed"].includes(shape.uploadState))
      );

    case "svg":
      return (
        typeof shape.svgContent === "string" &&
        shape.svgContent.length > 0 &&
        typeof shape.originalWidth === "number" &&
        shape.originalWidth > 0 &&
        typeof shape.originalHeight === "number" &&
        shape.originalHeight > 0
      );

    // ✅ Enhanced freeshape validation
    case "freeshape":
      return (
        Array.isArray(shape.points) &&
        shape.points.length >= 2 &&
        shape.points.every(
          (point: any) =>
            typeof point.x === "number" &&
            typeof point.y === "number" &&
            ["move", "curve", "line"].includes(point.type)
        ) &&
        typeof shape.closed === "boolean" &&
        typeof shape.color === "number" &&
        typeof shape.strokeColor === "number" &&
        typeof shape.strokeWidth === "number" &&
        shape.strokeWidth >= 0 &&
        typeof shape.smoothness === "number"
      );

    case "container":
      const hasContainerProps =
        Array.isArray(shape.children) && typeof shape.expanded === "boolean";

      if (!hasContainerProps) return false;

      // ✅ Validate specific container types
      if (shape.defaultSeatSettings) {
        // AreaModeContainer validation
        return typeof shape.defaultSeatSettings === "object";
      }

      if (shape.gridName) {
        // GridShape validation
        return (
          typeof shape.gridName === "string" &&
          typeof shape.seatSettings === "object" &&
          shape.createdAt instanceof Date
        );
      }

      if (shape.rowName && !shape.gridName) {
        // RowShape validation
        return (
          typeof shape.rowName === "string" &&
          typeof shape.seatSpacing === "number" &&
          typeof shape.gridId === "string" &&
          ["left", "middle", "right", "none"].includes(shape.labelPlacement) &&
          shape.createdAt instanceof Date
        );
      }

      return true;

    default:
      return false;
  }
};

// ✅ Add specific validation functions for complex types
export const validateSeatGridSettings = (settings: any): boolean => {
  return (
    settings &&
    typeof settings === "object" &&
    typeof settings.seatSpacing === "number" &&
    settings.seatSpacing >= 0 &&
    typeof settings.rowSpacing === "number" &&
    settings.rowSpacing >= 0 &&
    typeof settings.seatRadius === "number" &&
    settings.seatRadius > 0 &&
    typeof settings.seatColor === "number" &&
    typeof settings.seatStrokeColor === "number" &&
    typeof settings.seatStrokeWidth === "number" &&
    settings.seatStrokeWidth >= 0 &&
    typeof settings.price === "number" &&
    settings.price >= 0
  );
};

export const validateSeatLabelStyle = (style: any): boolean => {
  return (
    style &&
    typeof style === "object" &&
    typeof style.fontFamily === "string" &&
    typeof style.fontSize === "number" &&
    style.fontSize > 0 &&
    typeof style.fontWeight === "string" &&
    typeof style.align === "string"
  );
};
