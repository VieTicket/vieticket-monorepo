import { DocumentType, getModelForClass, index, pre, prop } from '@typegoose/typegoose';
import { TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';
import mongoose from 'mongoose';
import { Shape } from '../models/seat-map-models';

@pre<SeatMapClass>('save', function () {
    this.updatedAt = new Date();
    if (!this.createdAt) {
        this.createdAt = new Date();
    }
})
@index({ name: 1 })
@index({ createdAt: 1 })
@index({ createdBy: 1 }) // Add index for querying by creator
export class SeatMapClass extends TimeStamps {
    @prop({
        required: [true, 'Name is required'],
        trim: true,
        minlength: [1, 'Name must be at least 1 character after trimming'],
        maxlength: [100, 'Name cannot exceed 100 characters'],
    })
    public name!: string;

    @prop({
        required: [true, 'Shapes array is required'],
        type: () => [Object], // Store as flexible objects to handle union types
        validate: {
            validator: function (shapes: Shape[]): boolean {
                if (!Array.isArray(shapes)) return false;

                // Validate each shape has required properties
                return shapes.every(shape =>
                    shape &&
                    typeof shape.id === 'string' &&
                    typeof shape.type === 'string' &&
                    typeof shape.x === 'number' &&
                    typeof shape.y === 'number' &&
                    ['rect', 'circle', 'text', 'polygon'].includes(shape.type)
                );
            },
            message: 'Invalid shapes array structure'
        }
    })
    public shapes!: Shape[];

    @prop({
        required: [true, 'Image URL is required'],
        validate: {
            validator: function (value: string): boolean {
                try {
                    new URL(value);
                    return true;
                } catch {
                    return false;
                }
            },
            message: 'Invalid URL format for image',
        },
    })
    public image!: string;

    @prop({
        required: [true, 'Creator ID is required'],
        type: String,
        validate: {
            validator: function (value: string): boolean {
                return typeof value === 'string' && value.trim().length > 0;
            },
            message: 'Creator ID must be a non-empty string',
        },
    })
    public createdBy!: string;

    // TimeStamps provides createdAt and updatedAt
    public createdAt!: Date;
    public updatedAt!: Date;
}

// Fix: Use existing model or create new one
export const SeatMapModel = mongoose.models.SeatMapClass || getModelForClass(SeatMapClass, {
    schemaOptions: {
        collection: 'seatmaps',
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
