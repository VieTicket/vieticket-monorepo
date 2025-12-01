import mongoose from "mongoose";
import { CanvasItem } from "../models/seat-map-models";

// ✅ Clear any existing models
if (mongoose.models.SeatMap) {
  delete mongoose.models.SeatMap;
}

const seatMapSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    shapes: {
      type: [mongoose.Schema.Types.Mixed],
      required: [true, "Shapes are required"],
      default: [],
    },
    image: {
      type: String,
      required: [true, "Image is required"],
    },
    usedByEvent: {
      type: String,
      required: false,
      default: null,
    },
    createdBy: {
      type: String,
      required: [true, "CreatedBy is required"],
      trim: true,
    },
    publicity: {
      type: String,
      enum: ["public", "private"],
      default: "private",
      required: [true, "Publicity is required"],
    },
    draftedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SeatMap",
      required: false,
    },
    originalCreator: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
    collection: "seatmaps",
    toJSON: {
      transform: (doc: any, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
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
  }
);

// Add indexes
seatMapSchema.index({ name: 1 });
seatMapSchema.index({ createdBy: 1 });
seatMapSchema.index({ publicity: 1 });
seatMapSchema.index({ createdAt: -1 });

// Add pre-save hook
seatMapSchema.pre("save", function () {
  console.log("Pre-save hook called with data:", {
    name: this.name,
    createdBy: this.createdBy,
    publicity: this.publicity,
    shapes: this.shapes?.length || 0,
  });
});

export const SeatMapModel = mongoose.model("SeatMap", seatMapSchema);

export type SeatMapDocument = mongoose.Document & {
  id: string;
  name: string;
  shapes: CanvasItem[];
  image: string;
  usedByEvent?: string | null;
  createdBy: string;
  publicity: "public" | "private";
  draftedFrom?: mongoose.Types.ObjectId;
  originalCreator?: string;
  createdAt: Date;
  updatedAt: Date;
};
