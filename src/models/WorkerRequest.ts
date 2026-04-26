import mongoose, { Schema } from 'mongoose';

export interface IWorkerRequest {
    _id: string;
    exporterId: string | Record<string, any>;
    numberOfContainers: number;
    numberOfBags: number;
    numberOfWorkersNeeded: number;
    startDate: Date;
    idealCompletionDate: Date;
    notes?: string;
    status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
    adminNotes?: string;
    reviewedBy?: string | Record<string, any>;
    reviewedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const workerRequestSchema = new Schema<IWorkerRequest>(
    {
        exporterId: {
            type: Schema.Types.ObjectId,
            ref: 'Exporter',
            required: true,
        },
        numberOfContainers: {
            type: Number,
            required: true,
            min: 1,
        },
        numberOfBags: {
            type: Number,
            required: true,
            min: 1,
        },
        numberOfWorkersNeeded: {
            type: Number,
            required: true,
            min: 1,
        },
        startDate: {
            type: Date,
            required: true,
        },
        idealCompletionDate: {
            type: Date,
            required: true,
        },
        notes: {
            type: String,
            trim: true,
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'fulfilled'],
            default: 'pending',
        },
        adminNotes: {
            type: String,
            trim: true,
        },
        reviewedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        reviewedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

const WorkerRequestModel =
    mongoose.models.WorkerRequest ||
    mongoose.model<IWorkerRequest>('WorkerRequest', workerRequestSchema);

export default WorkerRequestModel;
