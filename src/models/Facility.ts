import mongoose, { Schema, Model } from 'mongoose';
import type { Facility } from '@/types';

const facilitySchema = new Schema<Facility>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
        },
        location: {
            type: String,
            required: true,
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

facilitySchema.index({ code: 1 });

const FacilityModel: Model<Facility> =
    mongoose.models.Facility ||
    mongoose.model<Facility>('Facility', facilitySchema);

export default FacilityModel;
