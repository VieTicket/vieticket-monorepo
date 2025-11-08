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
@index({ publicity: 1 }) // Add index for public seat maps
@index({ draftedFrom: 1 }) // Add index for tracking drafts
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
    type: () => [Object], // Store as flexible objects to handle union types
    validate: {
      validator: function (shapes: CanvasItem[]): boolean {
        if (!Array.isArray(shapes)) return false;

        // Validate each shape has required PIXI.js BaseCanvasItem properties
        return shapes.every((shape) => {
          if (!shape || typeof shape !== "object") return false;

          // Check required base properties for all PIXI.js canvas items
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

          // Validate specific shape types
          const validTypes = [
            "rectangle",
            "ellipse",
            "text",
            "polygon",
            "image",
            "svg",
            "container",
          ];

          if (!validTypes.includes(shape.type)) return false;

          // Type-specific validation
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
              return (
                typeof ellipse.radiusX === "number" &&
                ellipse.radiusX >= 0 &&
                typeof ellipse.radiusY === "number" &&
                ellipse.radiusY >= 0 &&
                typeof ellipse.color === "number" &&
                typeof ellipse.strokeColor === "number" &&
                typeof ellipse.strokeWidth === "number" &&
                ellipse.strokeWidth >= 0
              );

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
                    typeof point.x === "number" && typeof point.y === "number"
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
                // Optional upload state validation
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

            case "container":
              const container = shape as any;
              return (
                Array.isArray(container.children) &&
                typeof container.expanded === "boolean" &&
                // Recursively validate children if they exist
                container.children.every(
                  (child: any) => this.validator([child]) // Validate each child using the same validator
                )
              );

            default:
              return false;
          }
        });
      },
      message:
        "Invalid shapes array: All shapes must be valid PIXI.js canvas items with required properties",
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
          // Allow http, https, and data URLs
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

  // ✅ Publicity setting
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

  // ✅ Reference to original seat map if this is a draft
  @prop({
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: "SeatMapClass",
    validate: {
      validator: async function (
        value: mongoose.Types.ObjectId | null
      ): Promise<boolean> {
        if (!value) return true; // null/undefined is valid (not a draft)

        try {
          // Check if the referenced seat map exists and is public
          const SeatMapModel =
            mongoose.models.SeatMapClass ||
            mongoose.model("SeatMapClass", this.constructor.schema);

          const originalSeatMap = await SeatMapModel.findById(value);
          if (!originalSeatMap) return false; // Referenced seat map doesn't exist

          // Can only draft from public seat maps
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

  // ✅ Original creator of the seat map concept
  @prop({
    required: false,
    type: String,
    validate: {
      validator: function (value: string | undefined): boolean {
        if (!value) return true; // undefined is valid
        return typeof value === "string" && value.trim().length > 0;
      },
      message: "Original creator ID must be a non-empty string if provided",
    },
  })
  public originalCreator?: string;

  // TimeStamps provides createdAt and updatedAt
  public createdAt!: Date;
  public updatedAt!: Date;
}

// ✅ Create model with proper configuration
export const SeatMapModel =
  mongoose.models.SeatMapClass ||
  getModelForClass(SeatMapClass, {
    schemaOptions: {
      collection: "seatmaps",
      timestamps: true,
      // ✅ Enhanced JSON transformation
      toJSON: {
        transform: (doc: any, ret: any) => {
          ret.id = ret._id.toString();
          delete ret._id;
          delete ret.__v;

          // Ensure dates are properly formatted
          if (ret.createdAt) ret.createdAt = ret.createdAt.toISOString();
          if (ret.updatedAt) ret.updatedAt = ret.updatedAt.toISOString();

          // Transform draftedFrom ObjectId to string if present
          if (ret.draftedFrom) ret.draftedFrom = ret.draftedFrom.toString();

          return ret;
        },
      },
      // ✅ Enhanced Object transformation
      toObject: {
        transform: (doc: any, ret: any) => {
          ret.id = ret._id.toString();
          delete ret._id;
          delete ret.__v;

          // Transform draftedFrom ObjectId to string if present
          if (ret.draftedFrom) ret.draftedFrom = ret.draftedFrom.toString();

          return ret;
        },
      },
      // ✅ Add validation options
      validateBeforeSave: true,
      strict: true, // Only allow schema-defined fields
      strictQuery: false, // Allow flexible queries
    },
  });

// ✅ Export type aliases
export type SeatMapDocument = DocumentType<SeatMapClass>;

// ✅ Add helper functions for shape validation
export const validateCanvasItem = (shape: any): boolean => {
  if (!shape || typeof shape !== "object") return false;

  // Check required base properties
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
      return (
        typeof shape.radiusX === "number" &&
        shape.radiusX >= 0 &&
        typeof shape.radiusY === "number" &&
        shape.radiusY >= 0 &&
        typeof shape.color === "number" &&
        typeof shape.strokeColor === "number" &&
        typeof shape.strokeWidth === "number" &&
        shape.strokeWidth >= 0
      );

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
            typeof point.x === "number" && typeof point.y === "number"
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

    case "container":
      return (
        Array.isArray(shape.children) && typeof shape.expanded === "boolean"
      );

    default:
      return false;
  }
};
