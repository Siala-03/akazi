import mongoose, { Schema, Model } from 'mongoose';
import type { Attendance } from '@/types';

const attendanceSchema = new Schema(
    {
        workerId: {
            type: Schema.Types.ObjectId,
            ref: 'Worker',
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
        checkInTime: {
            type: Date,
            required: true,
        },
        checkOutTime: {
            type: Date,
        },
        status: {
            type: String,
            enum: ['on-site', 'checked-out'],
            default: 'on-site',
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
attendanceSchema.index({ workerId: 1, date: 1 });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ status: 1, date: 1 });

// CRITICAL: Prevent multiple attendance records for same worker on same day
// One worker = One check-in per day (operational flow requirement)
attendanceSchema.index({ workerId: 1, date: 1 }, { unique: true });

const AttendanceModel: Model<Attendance> =
    mongoose.models.Attendance ||
    mongoose.model<Attendance>('Attendance', attendanceSchema);

export default AttendanceModel;
