import {
  DocumentType,
  getModelForClass,
  index,
  pre,
  prop,
} from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import mongoose from "mongoose";
import { Shape } from "../models/seat-map-models";

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
      validator: function (shapes: Shape[]): boolean {
        if (!Array.isArray(shapes)) return false;

        // Validate each shape has required properties
        return shapes.every(
          (shape) =>
            shape &&
            typeof shape.id === "string" &&
            typeof shape.type === "string" &&
            typeof shape.x === "number" &&
            typeof shape.y === "number" &&
            ["rect", "circle", "text", "polygon"].includes(shape.type)
        );
      },
      message: "Invalid shapes array structure",
    },
  })
  public shapes!: Shape[];

  @prop({
    required: [true, "Image URL is required"],
    validate: {
      validator: function (value: string): boolean {
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      },
      message: "Invalid URL format for image",
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

  // NEW: Publicity setting
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

  // NEW: Reference to original seat map if this is a draft
  @prop({
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: "SeatMapClass",
    validate: {
      validator: async function (
        value: mongoose.Types.ObjectId | null
      ): Promise<boolean> {
        if (!value) return true; // null/undefined is valid (not a draft)

        // Check if the referenced seat map exists and is public
        const SeatMapModel =
          mongoose.models.SeatMapClass ||
          mongoose.model("SeatMapClass", this.constructor.schema);

        const originalSeatMap = await SeatMapModel.findById(value);
        if (!originalSeatMap) return false; // Referenced seat map doesn't exist

        // Can only draft from public seat maps
        return originalSeatMap.publicity === "public";
      },
      message: "Can only draft from existing public seat maps",
    },
  })
  public draftedFrom?: mongoose.Types.ObjectId;

  // NEW: Original creator of the seat map concept
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

// Fix: Use existing model or create new one
export const SeatMapModel =
  mongoose.models.SeatMapClass ||
  getModelForClass(SeatMapClass, {
    schemaOptions: {
      collection: "seatmaps",
      timestamps: true,
      toJSON: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        transform: (doc: any, ret: any) => {
          ret.id = ret._id.toString();
          delete ret._id;
          delete ret.__v;
          return ret;
        },
      },
      toObject: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        transform: (doc: any, ret: any) => {
          ret.id = ret._id.toString();
          delete ret._id;
          delete ret.__v;
          return ret;
        },
      },
    },
  });

// Export type aliases
export type SeatMapDocument = DocumentType<SeatMapClass>;
