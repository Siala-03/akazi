import mongoose, { Schema, Model } from 'mongoose';
import type { User } from '@/types';

const userSchema = new Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            enum: ['supervisor', 'admin', 'exporter'],
            required: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        phone: {
            type: String,
            required: true,
            trim: true,
        },
        profilePicture: {
            type: String,
            default: '',
        },
        exporterId: {
            type: Schema.Types.ObjectId,
            ref: 'Exporter',
        },
        facilityId: {
            type: Schema.Types.ObjectId,
            ref: 'Facility',
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        resetOtp: {
            type: String,
            default: null,
        },
        resetOtpExpiry: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Index for faster queries
userSchema.index({ role: 1, isActive: 1 });

const UserModel: Model<User> =
    mongoose.models.User || mongoose.model<User>('User', userSchema);

export default UserModel;
