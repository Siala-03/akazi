import mongoose, { Schema, Model } from 'mongoose';
import type { AuditLog } from '@/types';

const auditLogSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        action: {
            type: String,
            required: true,
        },
        entity: {
            type: String,
            required: true,
        },
        entityId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        changes: {
            type: Schema.Types.Mixed,
            required: true,
        },
        reason: {
            type: String,
        },
        ipAddress: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

// Indexes
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ entity: 1, entityId: 1 });
auditLogSchema.index({ createdAt: -1 });

const AuditLogModel: Model<AuditLog> =
    mongoose.models.AuditLog ||
    mongoose.model<AuditLog>('AuditLog', auditLogSchema);

export default AuditLogModel;
