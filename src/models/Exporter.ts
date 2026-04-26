import mongoose, { Schema, Model } from 'mongoose';
import type { Exporter } from '@/types';

const exporterSchema = new Schema<Exporter>(
    {
        exporterCode: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
        },
        tinNumber: {
            type: String,
            trim: true,
            sparse: true,
        },
        companyTradingName: {
            type: String,
            required: true,
            trim: true,
        },
        companyAddress: {
            type: String,
            required: true,
            trim: true,
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
        email: {
            type: String,
            required: true,
            lowercase: true,
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

exporterSchema.index({ isActive: 1 });

const ExporterModel: Model<Exporter> =
    mongoose.models.Exporter ||
    mongoose.model<Exporter>('Exporter', exporterSchema);

export default ExporterModel;
