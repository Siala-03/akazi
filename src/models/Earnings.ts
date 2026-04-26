import mongoose, { Schema, Model } from 'mongoose';
import type { Earnings } from '@/types';

const earningsSchema = new Schema(
    {
        workerId: {
            type: Schema.Types.ObjectId,
            ref: 'Worker',
            required: true,
        },
        exporterId: {
            type: Schema.Types.ObjectId,
            ref: 'Exporter',
            required: true,
        },
        date: {
            type: Date,
            required: true,
        },
        bagsProcessed: {
            type: Number,
            required: true,
            min: 0,
        },
        ratePerBag: {
            type: Number,
            required: true,
            min: 0,
        },
        totalEarnings: {
            type: Number,
            required: true,
            min: 0,
        },
        status: {
            type: String,
            enum: ['computed', 'locked'],
            default: 'computed',
        },
        computedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
earningsSchema.index({ workerId: 1, date: 1 });
earningsSchema.index({ exporterId: 1, date: 1 });
earningsSchema.index({ date: 1, status: 1 });

const EarningsModel: Model<Earnings> =
    mongoose.models.Earnings ||
    mongoose.model<Earnings>('Earnings', earningsSchema);

export default EarningsModel;
