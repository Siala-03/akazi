import mongoose, { Schema, Model } from 'mongoose';
import type { Worker } from '@/types';

const workerSchema = new Schema(
    {
        workerId: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
        },
        gender: {
            type: String,
            enum: ['male', 'female', 'other'],
            required: true,
        },
        dateOfBirth: {
            type: Date,
        },
        ageRange: {
            type: String,
        },
        phone: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
        },
        photo: {
            type: String,
            required: true,
        },
        cooperativeId: {
            type: Schema.Types.ObjectId,
            ref: 'Cooperative',
            required: true,
        },
        facilityId: {
            type: Schema.Types.ObjectId,
            ref: 'Facility',
        },
        primaryRole: {
            type: String,
            required: true,
        },
        enrollmentDate: {
            type: Date,
            default: Date.now,
        },
        hourlyRate: {
            type: Number,
            default: 50,
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'suspended'],
            default: 'active',
        },
        // Impact baseline
        previousWorkType: String,
        avgDaysWorkedPerMonth: Number,
        typicalDailyEarnings: String,
        previousPaymentMethod: String,
        householdSize: String,
        isPrimaryEarner: Boolean,
        skillsNotes: String,
        // QR code token for check-in scanning
        qrToken: {
            type: String,
            unique: true,
            sparse: true,
        },
        // Consent
        consentWorkRecords: {
            type: Boolean,
            required: true,
        },
        consentAnonymizedReporting: {
            type: Boolean,
            default: false,
        },
        consentTimestamp: {
            type: Date,
            required: true,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
workerSchema.index({ cooperativeId: 1, status: 1 });
workerSchema.index({ status: 1 });
workerSchema.index({ phone: 1 });
workerSchema.index({ fullName: 'text' });

const WorkerModel: Model<Worker> =
    mongoose.models.Worker || mongoose.model<Worker>('Worker', workerSchema);

export default WorkerModel;
