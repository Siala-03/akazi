/**
 * Model preloader to ensure all Mongoose models are registered
 * Import this file in API routes that need models to avoid registration errors
 */

import WorkerModel from '@/models/Worker';
import AttendanceModel from '@/models/Attendance';
import SessionModel from '@/models/Session';
import BagModel from '@/models/Bag';
import ExporterModel from '@/models/Exporter';
import RateCardModel from '@/models/RateCard';
import UserModel from '@/models/User';
import CooperativeModel from '@/models/Cooperative';
import FacilityModel from '@/models/Facility';
import EarningsModel from '@/models/Earnings';
import AuditLogModel from '@/models/AuditLog';
import WorkerRequestModel from '@/models/WorkerRequest';

export {
  WorkerModel,
  AttendanceModel,
  SessionModel,
  BagModel,
  ExporterModel,
  RateCardModel,
  UserModel,
  CooperativeModel,
  FacilityModel,
  EarningsModel,
  AuditLogModel,
  WorkerRequestModel,
};
