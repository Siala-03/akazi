/**
 * Transforms a Prisma record to match the MongoDB/Mongoose response shape:
 * - Adds _id as an alias for id
 * - Renames Prisma relation fields back to their FK field names (e.g. worker → workerId)
 * - Recursively applies to nested included relations
 *
 * relMap: maps prismaRelationName → mongoFieldName
 * e.g. { worker: 'workerId', exporter: 'exporterId' }
 */
export function toMongo<T extends Record<string, any>>(
    obj: T | null,
    relMap?: Record<string, string>
): any {
    if (!obj) return null;

    const result: any = { ...obj };
    if (result.id && typeof result.id === 'string') {
        result._id = result.id;
    }

    // Apply relation renames first
    if (relMap) {
        for (const [prismaName, mongoName] of Object.entries(relMap)) {
            if (prismaName in result) {
                const val = result[prismaName];
                delete result[prismaName];
                if (val !== null && val !== undefined) {
                    if (Array.isArray(val)) {
                        result[mongoName] = val.map((v: any) =>
                            v && typeof v === 'object' && v.id ? toMongo(v) : v
                        );
                    } else if (typeof val === 'object' && val.id) {
                        result[mongoName] = toMongo(val);
                    } else {
                        result[mongoName] = val;
                    }
                }
                // If val is null/undefined and mongoName already has a string FK value, leave it
            }
        }
    }

    // Recursively process remaining nested objects/arrays
    for (const key of Object.keys(result)) {
        const val = result[key];
        if (val && typeof val === 'object' && !Array.isArray(val) && val.id && typeof val.id === 'string') {
            result[key] = toMongo(val);
        } else if (Array.isArray(val)) {
            result[key] = val.map((v: any) =>
                v && typeof v === 'object' && v.id && typeof v.id === 'string' ? toMongo(v) : v
            );
        }
    }

    return result;
}

/** Maps an array through toMongo */
export function toMongoArray<T extends Record<string, any>>(
    arr: T[],
    relMap?: Record<string, string>
): any[] {
    return arr.map((item) => toMongo(item, relMap));
}

/** Common relation maps for reuse across routes */
export const REL = {
    worker: { worker: 'workerId' },
    workerAndFacility: { worker: 'workerId', facility: 'facilityId' },
    workerFacilitySupervisor: { worker: 'workerId', facility: 'facilityId', supervisor: 'supervisorId' },
    exporterFacility: { exporter: 'exporterId', facility: 'facilityId' },
    exporterFacilitySupervisor: { exporter: 'exporterId', facility: 'facilityId', supervisor: 'supervisorId' },
    workerExporterFacilitySupervisor: {
        worker: 'workerId',
        exporter: 'exporterId',
        facility: 'facilityId',
        supervisor: 'supervisorId',
        attendance: 'attendanceId',
    },
    cooperative: { cooperative: 'cooperativeId' },
    workerCooperative: { cooperative: 'cooperativeId', facility: 'facilityId' },
    exporterCreator: { exporter: 'exporterId', creator: 'createdBy' },
    exporterReviewer: { exporter: 'exporterId', reviewer: 'reviewedBy' },
};
