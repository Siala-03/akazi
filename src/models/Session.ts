import mongoose, { Schema, Model } from 'mongoose';
import type { Session } from '@/types';

const sessionSchema = new Schema(
    {
        attendanceId: {
            type: Schema.Types.ObjectId,
            ref: 'Attendance',
            required: true,
        },
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
        facilityId: {
            type: Schema.Types.ObjectId,
            ref: 'Facility',
            required: false,
        },
        date: {
            type: Date,
            required: true,
        },
        startTime: {
            type: Date,
            required: true,
        },
        endTime: {
            type: Date,
        },
        status: {
            type: String,
            enum: ['active', 'closed', 'validated'],
            default: 'active',
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
sessionSchema.index({ workerId: 1, date: 1 }, { unique: false });
sessionSchema.index({ status: 1 });
sessionSchema.index({ attendanceId: 1 });

const SessionModel: Model<Session> =
    mongoose.models.Session || mongoose.model<Session>('Session', sessionSchema);

export default SessionModel;
