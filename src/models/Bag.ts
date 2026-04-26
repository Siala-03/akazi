import mongoose, { Schema, Model } from 'mongoose';
import type { Bag } from '@/types';

const bagSchema = new Schema(
    {
        bagNumber: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
        },
        exporterId: {
            type: Schema.Types.ObjectId,
            ref: 'Exporter',
            required: true,
        },
        facilityId: {
            type: Schema.Types.ObjectId,
            ref: 'Facility',
            required: false,
        },
        date: {
            type: Date,
            required: true,
        },
        weight: {
            type: Number,
            default: 60,
        },
        workers: [
            {
                workerId: {
                    type: Schema.Types.ObjectId,
                    ref: 'Worker',
                    required: true,
                },
                sessionId: {
                    type: Schema.Types.ObjectId,
                    ref: 'Session',
                    required: true,
                },
            },
        ],
        status: {
            type: String,
            enum: ['completed', 'validated', 'locked'],
            default: 'completed',
        },
        supervisorId: {
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

bagSchema.index({ exporterId: 1, date: 1 });
bagSchema.index({ date: 1, status: 1 });
bagSchema.index({ 'workers.workerId': 1 });

// Validation: Ensure 2-4 workers per bag
bagSchema.path('workers').validate(function (workers) {
    return workers.length >= 2 && workers.length <= 4;
}, 'Each bag must have between 2 and 4 workers');

const BagModel: Model<Bag> =
    mongoose.models.Bag || mongoose.model<Bag>('Bag', bagSchema);

export default BagModel;
