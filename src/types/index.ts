export interface User {
    _id: string;
    email: string;
    password: string;
    role: 'supervisor' | 'admin' | 'exporter';
    name: string;
    phone: string;
    profilePicture?: string;
    exporterId?: string;
    facilityId?: string;
    isActive: boolean;
    resetOtp?: string | null;
    resetOtpExpiry?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface Worker {
    _id: string;
    workerId: string;
    fullName: string;
    gender: 'male' | 'female' | 'other';
    dateOfBirth?: Date;
    ageRange?: string;
    phone: string;
    email?: string;
    photo: string;
    cooperativeId: string;
    primaryRole: string;
    enrollmentDate: Date;
    hourlyRate?: number;
    status: 'active' | 'inactive' | 'suspended';
    // Impact baseline
    previousWorkType?: string;
    avgDaysWorkedPerMonth?: number;
    typicalDailyEarnings?: string;
    previousPaymentMethod?: string;
    householdSize?: string;
    isPrimaryEarner?: boolean;
    skillsNotes?: string;
    qrToken?: string;
    // Consent
    consentWorkRecords: boolean;
    consentAnonymizedReporting: boolean;
    consentTimestamp: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface Exporter {
    _id: string;
    exporterCode: string;
    tinNumber?: string;
    companyTradingName: string;
    companyAddress: string;
    contactPerson: string;
    phone: string;
    email: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Cooperative {
    _id: string;
    name: string;
    code: string;
    contactPerson: string;
    phone: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Facility {
    _id: string;
    name: string;
    code: string;
    location: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Attendance {
    _id: string;
    workerId: string;
    facilityId: string;
    date: Date;
    checkInTime: Date;
    checkOutTime?: Date;
    status: 'on-site' | 'checked-out';
    supervisorId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Session {
    _id: string;
    attendanceId: string;
    workerId: string;
    exporterId: string;
    facilityId: string;
    date: Date;
    startTime: Date;
    endTime?: Date;
    status: 'active' | 'closed' | 'validated';
    supervisorId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface BagWorker {
    workerId: string;
    sessionId: string;
}

export interface Bag {
    _id: string;
    bagNumber: string;
    exporterId: string;
    facilityId: string;
    date: Date;
    weight: number;
    workers: BagWorker[];
    status: 'completed' | 'validated' | 'locked';
    supervisorId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Earnings {
    _id: string;
    workerId: string;
    exporterId: string;
    date: Date;
    bagsProcessed: number;
    ratePerBag: number;
    totalEarnings: number;
    status: 'computed' | 'locked';
    computedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface RateCard {
    _id: string;
    exporterId?: string;
    ratePerBag: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
    isActive: boolean;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface AuditLog {
    _id: string;
    userId: string;
    action: string;
    entity: string;
    entityId: string;
    changes: Record<string, unknown>;
    reason?: string;
    ipAddress: string;
    createdAt: Date;
}

// Form types
export interface LoginForm {
    email: string;
    password: string;
}

export interface WorkerOnboardingForm {
    fullName: string;
    gender: 'male' | 'female' | 'other';
    dateOfBirth?: string;
    ageRange?: string;
    phone: string;
    photo: File | string;
    primaryRole: string;
    previousWorkType?: string;
    avgDaysWorkedPerMonth?: number;
    typicalDailyEarnings?: string;
    previousPaymentMethod?: string;
    householdSize?: string;
    isPrimaryEarner?: boolean;
    skillsNotes?: string;
    consentWorkRecords: boolean;
    consentAnonymizedReporting: boolean;
}

export interface CheckInForm {
    workerId: string;
    facilityId: string;
}

export interface SessionForm {
    workerId: string;
    exporterId: string;
}

export interface BagForm {
    exporterId: string;
    workerIds: string[];
    weight?: number;
}

export interface WorkerRequest {
    _id: string;
    exporterId: string | Record<string, any>;
    numberOfContainers: number;
    numberOfBags: number;
    numberOfWorkersNeeded: number;
    startDate: Date | string;
    idealCompletionDate: Date | string;
    notes?: string;
    status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
    adminNotes?: string;
    reviewedBy?: string | Record<string, any>;
    reviewedAt?: Date | string;
    createdAt: Date | string;
    updatedAt: Date | string;
}
