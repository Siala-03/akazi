import mongoose, { Schema, Model } from 'mongoose';
import type { RateCard } from '@/types';

const rateCardSchema = new Schema(
    {
        exporterId: {
            type: Schema.Types.ObjectId,
            ref: 'Exporter',
        },
        ratePerBag: {
            type: Number,
            required: true,
            min: 0,
        },
        effectiveFrom: {
            type: Date,
            required: true,
        },
        effectiveTo: {
            type: Date,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
rateCardSchema.index({ exporterId: 1, isActive: 1 });
rateCardSchema.index({ effectiveFrom: 1, effectiveTo: 1 });

const RateCardModel: Model<RateCard> =
    mongoose.models.RateCard ||
    mongoose.model<RateCard>('RateCard', rateCardSchema);

export default RateCardModel;
