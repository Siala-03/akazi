import mongoose, { Schema, Model } from 'mongoose';
import type { Cooperative } from '@/types';

const cooperativeSchema = new Schema<Cooperative>(
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
        contactPerson: {
            type: String,
            required: true,
            trim: true,
        },
        phone: {
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

cooperativeSchema.index({ code: 1 });

const CooperativeModel: Model<Cooperative> =
    mongoose.models.Cooperative ||
    mongoose.model<Cooperative>('Cooperative', cooperativeSchema);

export default CooperativeModel;
