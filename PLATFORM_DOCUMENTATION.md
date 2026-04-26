# CWMS Platform Documentation
## Casual Worker Management System - Complete Guide

**Version:** 2.1  
**Last Updated:** February 10, 2026  
**Status:** Production Ready  

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Getting Started](#getting-started)
4. [User Roles & Permissions](#user-roles--permissions)
5. [Features & Workflows](#features--workflows)
6. [API Documentation](#api-documentation)
7. [Database Schema](#database-schema)
8. [Security](#security)
9. [Troubleshooting](#troubleshooting)
10. [Deployment](#deployment)

---

## 🎯 Overview

### What is CWMS?

CWMS (Casual Worker Management System) is a digital platform designed specifically for managing casual workers in Rwanda's coffee sorting industry. It operates under the Iwacu Cooperative model, serving multiple coffee exporters at NAEB facilities.

### Core Purpose

- **Capture verifiable work** - Track attendance and work sessions accurately
- **Attribute shared output correctly** - Record bag-level production with worker assignments
- **Calculate earnings defensibly** - Generate transparent, auditable earnings records
- **Enable longitudinal tracking** - Build work and income history over time

### Key Principles

✅ **Field usability first** - Designed for supervisors working on-site  
✅ **Auditability** - Full audit trail on all actions  
✅ **Minimal data collection** - Only collect what's necessary  
✅ **Future extensibility** - Ready for payments, savings, and loans integration  

---

## 🏗️ System Architecture

### Technology Stack

**Frontend:**
- Next.js 16 (React 19)
- TailwindCSS for styling
- React Hook Form + Zod for validation
- React Hot Toast for notifications
- Recharts for analytics

**Backend:**
- Next.js API Routes
- Node.js runtime
- JWT authentication with HTTP-only cookies

**Database:**
- MongoDB with Mongoose ORM
- Indexed for performance
- Full audit trail support

**Deployment:**
- Vercel (recommended) or any Node.js host
- MongoDB Atlas for production database

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Login    │  │Dashboard │  │ Workers  │  │  Profile │   │
│  │  Page    │  │   Page   │  │   Page   │  │   Page   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/HTTPS
┌─────────────────────────────────────────────────────────────┐
│                      MIDDLEWARE LAYER                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Authentication Middleware (JWT Verification)          │ │
│  │  - Cookie validation                                   │ │
│  │  - Role-based access control                          │ │
│  │  - Route protection                                    │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↕ 
┌─────────────────────────────────────────────────────────────┐
│                       API ROUTES LAYER                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Auth    │  │ Workers  │  │Attendance│  │   Bags   │   │
│  │   API    │  │   API    │  │   API    │  │   API    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ Mongoose ODM
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    MongoDB Atlas                        │ │
│  │  Collections: Users, Workers, Attendance, Sessions,    │ │
│  │               Bags, Exporters, RateCards              │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have:

- **Node.js** 18+ installed
- **MongoDB** database (local or Atlas)
- **npm** or **yarn** package manager
- **Git** for version control

### Installation Steps

#### 1. Clone the Repository

```bash
cd /home/enock/ikawa
# Repository already exists
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Environment Setup

Create `.env.local` file in the root directory:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/cwms

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# File Uploads
UPLOAD_DIR=./public/uploads
MAX_FILE_SIZE=5242880
```

**Important:** Change `JWT_SECRET` in production to a secure random string:
```bash
openssl rand -base64 32
```

#### 4. Seed the Database

```bash
curl -X POST http://localhost:3000/api/seed
```

This creates:
- Admin user: `admin@cwms.rw` / `admin123`
- Supervisor user: `supervisor@cwms.rw` / `super123`
- Exporter user: `exporter@rwandacoffee.rw` / `exporter123`
- Sample workers, facilities, and cooperatives

#### 5. Start Development Server

```bash
npm run dev
```

Visit: **http://localhost:3000**

---

## 👥 User Roles & Permissions

### 1. Supervisor (Primary User)

**Access Level:** Daily Operations

**Responsibilities:**
- Worker onboarding (≤5 minutes per worker)
- Daily attendance tracking (check-in/check-out)
- Exporter assignments per shift
- Bag-level output attribution
- Data accuracy accountability

**Dashboard Features:**
- Today's attendance stats
- Active workers count
- Bags processed today
- Quick actions (onboard, check-in)

**Navigation:**
- 📊 Dashboard
- ⚙️ Daily Operations
- 👥 Workers Directory
- ➕ Worker Onboarding
- 👤 Profile

**Can Do:**
✅ Register new workers  
✅ Mark attendance entry/exit  
✅ Assign workers to exporters  
✅ Record completed bags  
✅ View worker earnings  
✅ Generate operational reports  

**Cannot Do:**
❌ Delete worker records  
❌ Modify locked earnings  
❌ Access other facilities' data  
❌ Change system configuration  

---

### 2. Admin (Operations/Kaawa)

**Access Level:** Full System Access

**Responsibilities:**
- System configuration
- User management (CRUD)
- Rate card management
- Reporting and analytics
- Data integrity monitoring

**Dashboard Features:**
- System-wide statistics
- User management panel
- Advanced analytics
- Audit trail access

**Navigation:**
- 📊 Dashboard
- 👥 Users Management
- 📈 Reports & Analytics
- ⚙️ System Settings
- 👤 Profile

**Can Do:**
✅ Everything supervisors can do  
✅ Create/edit/delete users  
✅ Manage exporters  
✅ Configure rate cards  
✅ Override locked earnings (with reason)  
✅ Access all facilities  
✅ View audit logs  

**Cannot Do:**
❌ Execute payments (Phase 2)  
❌ Modify historical attendance without audit  

---

### 3. Exporter User (Read-Only, Phase 1)

**Access Level:** View Own Data Only

**Responsibilities:**
- Monitor processing metrics
- Review worker-day allocations
- Download period reports
- Internal reconciliation

**Dashboard Features:**
- Bags processed summary
- Worker-days engaged
- Date-range filtering
- Export reports button

**Navigation:**
- 📊 Dashboard
- 📦 My Bags
- 👤 Profile

**Can Do:**
✅ View bags assigned to them  
✅ See aggregated worker metrics  
✅ Download reports (CSV)  
✅ Filter by date range  

**Cannot Do:**
❌ Edit any operational data  
❌ See worker PII  
❌ View other exporters' data  
❌ Assign workers  
❌ Modify attendance  

---

### 4. Casual Worker (No Direct Access - Phase 1)

**Status:** Interacts through supervisors

**Profile Managed By:** Supervisor during onboarding

**Records Generated:**
- Worker profile (demographics)
- Attendance records (daily)
- Work sessions (per shift)
- Bag attributions (shared output)
- Earnings calculations (daily)

**Future Access (Phase 2):**
- Mobile app for self-check-in
- View own earnings history
- Request advances/loans
- Savings account management

---

## 🔧 Features & Workflows

### Feature 1: Worker Onboarding

**Purpose:** Fast, low-friction creation of persistent worker records

**Target Time:** ≤ 5 minutes per worker

**Access:** Supervisor only

**Workflow:**

```
1. Navigate to /supervisor/onboarding
2. Fill required fields:
   - Full name
   - Gender (dropdown)
   - Date of birth OR age range
   - Phone number
   - Photo capture (camera)
   - Cooperative (pre-filled: Iwacu)
   - Primary role (dropdown)
3. Optional impact baseline:
   - Previous work type
   - Days worked per month (before CWMS)
   - Typical daily earnings (before)
   - Previous payment method
4. Consent checkboxes:
   ✓ Store work & earnings records (required)
   ✓ Anonymized reporting (optional)
5. Click "Register Worker"
6. System generates unique Worker ID
7. Worker appears in directory
```

**Validation Rules:**
- Photo is required
- Either DOB or age range (not both)
- Phone must be unique within cooperative (soft check)
- Consent to store records is mandatory

**Business Logic:**
- Worker status defaults to "Active"
- Enrollment date auto-set to today
- Created by supervisor ID is recorded
- Initial baseline captured once, never editable

---

### Feature 2: Daily Attendance

**Purpose:** Track worker presence at facility

**Access:** Supervisor only

**Check-In Workflow:**

```
1. Navigate to /supervisor/operations
2. Click "Check In Worker"
3. Search worker by name/phone/ID
4. Select worker from list
5. System records:
   - Worker ID
   - Timestamp
   - Facility ID
   - Supervisor ID
6. Worker status → "Checked In"
```

**Check-Out Workflow:**

```
1. Navigate to /supervisor/operations
2. View "Checked In Workers" list
3. Click "Check Out" next to worker
4. System records:
   - Exit timestamp
   - Total hours worked
5. Attendance record → Closed
6. Worker status → "Available for next shift"
```

**Business Rules:**
- No editing after check-out (admin override only)
- Worker can only be checked in once per day
- Check-out must be after check-in (validation)
- Attendance window captured for earnings calculation

---

### Feature 3: Exporter Assignment

**Purpose:** Assign workers to specific exporters per shift

**Access:** Supervisor only

**Workflow:**

```
1. Worker must be checked in
2. Navigate to /supervisor/operations
3. Click "Assign to Exporter"
4. Select:
   - Exporter from dropdown
   - Workers (multi-select)
   - Start time (auto: now)
5. Workers assigned to exporter
6. Assignment visible in dashboard
7. At shift end, click "End Assignment"
8. System records end time
```

**Business Rules:**
- Attendance cannot be split across exporters in one day
- Assignment must fall within attendance window
- Start time < End time (validation)
- All selected workers must have active attendance

---

### Feature 4: Bag Attribution

**Purpose:** Record completed bags with worker attribution

**Access:** Supervisor only

**Workflow:**

```
1. Navigate to /supervisor/operations
2. Click "Record Bag"
3. Fill details:
   - Exporter (dropdown)
   - Workers (select 2-4)
   - Weight (default: 60kg)
   - Quality notes (optional)
4. Click "Confirm Bag"
5. System:
   - Creates bag record
   - Links to workers
   - Updates dashboard stats
   - Adds to exporter's count
```

**Business Rules:**
- Minimum 2 workers per bag
- Maximum 4 workers per bag
- All workers must have active attendance
- Bag count increments immediately
- Workers see bag in their history

---

### Feature 5: Earnings Calculation

**Purpose:** Generate transparent, auditable earnings

**Access:** Auto-calculated, viewable by Supervisor/Admin

**Calculation Logic:**

```javascript
// Earnings calculated at day close (midnight)
// Rate pulled from active rate card

Worker Daily Earnings = Base Rate × Hours Worked

// Example:
// Base Rate: 2000 RWF/day
// Hours Worked: 8 hours
// Earnings: 2000 RWF

// Bag bonus (if applicable):
// Bonus per bag: 100 RWF
// Bags completed: 5
// Total bonus: 500 RWF
// Total earnings: 2000 + 500 = 2500 RWF
```

**Business Rules:**
- Earnings generated automatically at day close
- Once locked, earnings are immutable
- Overrides require admin role + reason code
- Displayed in worker profile
- Available for export/reporting

---

### Feature 6: Profile Management

**Purpose:** Manage user account settings and security

**Access:** All authenticated users

**Workflow:**

```
1. Click "Profile" in navigation
2. View profile information:
   - Name, email, phone
   - Role, status
   - Member since date
3. Edit profile:
   - Update name
   - Update phone
   - Save changes
4. Change password:
   - Enter current password
   - Enter new password (6+ chars)
   - Confirm new password
   - Update password
```

**Features:**
- Profile photo (first letter of name)
- Role badge (color-coded)
- Status indicator (Active/Inactive)
- Member since date
- Editable fields: name, phone
- Password change with validation

---

## 📡 API Documentation

### Authentication Endpoints

#### POST `/api/auth/login`

**Purpose:** Authenticate user and create session

**Request:**
```json
{
  "email": "supervisor@cwms.rw",
  "password": "super123"
}
```

**Response (200):**
```json
{
  "success": true,
  "redirectUrl": "/supervisor/dashboard",
  "user": {
    "id": "697c916db5ebaf9de1948d78",
    "email": "supervisor@cwms.rw",
    "name": "Facility Supervisor",
    "role": "supervisor"
  }
}
```

**Cookies Set:**
- `token`: JWT token (httpOnly, 7 days)

**Errors:**
- `400`: Missing email or password
- `401`: Invalid credentials
- `403`: Account deactivated

---

#### POST `/api/auth/register`

**Purpose:** Create new user account

**Request:**
```json
{
  "email": "new@cwms.rw",
  "password": "password123",
  "name": "New User",
  "phone": "+250788000000",
  "role": "supervisor"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "...",
    "email": "new@cwms.rw",
    "name": "New User",
    "role": "supervisor"
  },
  "redirectUrl": "/supervisor/dashboard"
}
```

**Errors:**
- `400`: Missing required fields
- `409`: Email already exists

---

#### GET `/api/auth/me`

**Purpose:** Get current authenticated user

**Headers:**
- Cookie: `token=<jwt>`

**Response (200):**
```json
{
  "user": {
    "id": "...",
    "email": "supervisor@cwms.rw",
    "name": "Facility Supervisor",
    "role": "supervisor",
    "phone": "+250788000000",
    "isActive": true,
    "createdAt": "2026-01-15T10:00:00.000Z"
  }
}
```

---

#### PUT `/api/auth/me`

**Purpose:** Update user profile

**Request:**
```json
{
  "name": "Updated Name",
  "phone": "+250788111111"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": { /* updated user object */ }
}
```

---

#### POST `/api/auth/change-password`

**Purpose:** Change user password

**Request:**
```json
{
  "currentPassword": "oldpass123",
  "newPassword": "newpass123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Errors:**
- `400`: Missing fields or password too short
- `401`: Current password incorrect

---

#### POST `/api/auth/logout`

**Purpose:** Destroy session

**Response (200):**
```json
{
  "success": true
}
```

**Cookies Cleared:**
- `token`

---

### Workers Endpoints

#### GET `/api/workers`

**Purpose:** List all workers with filtering

**Query Parameters:**
- `search`: Search by name/phone/ID
- `status`: Filter by status (active/inactive)
- `facility`: Filter by facility ID
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response (200):**
```json
{
  "workers": [
    {
      "id": "...",
      "fullName": "John Doe",
      "phone": "+250788000000",
      "gender": "male",
      "dateOfBirth": "1990-01-15",
      "nationalId": "...",
      "cooperativeId": "...",
      "facilityId": "...",
      "isActive": true,
      "createdAt": "2026-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

---

#### POST `/api/workers`

**Purpose:** Create new worker (onboarding)

**Request:**
```json
{
  "fullName": "Jane Doe",
  "gender": "female",
  "dateOfBirth": "1995-03-20",
  "phone": "+250788111111",
  "nationalId": "1234567890123456",
  "cooperativeId": "...",
  "facilityId": "...",
  "photo": "base64_encoded_image",
  "previousWorkType": "casual",
  "avgDaysWorkedPerMonth": 15,
  "typicalDailyEarnings": "1500-2000",
  "previousPaymentMethod": "cash",
  "consentToStore": true,
  "consentToReport": true
}
```

**Response (201):**
```json
{
  "success": true,
  "worker": { /* worker object */ }
}
```

---

#### GET `/api/workers/[id]`

**Purpose:** Get specific worker details

**Response (200):**
```json
{
  "worker": { /* full worker object */ },
  "attendance": { /* recent attendance records */ },
  "earnings": { /* earnings summary */ }
}
```

---

#### PUT `/api/workers/[id]`

**Purpose:** Update worker information

**Request:**
```json
{
  "phone": "+250788222222",
  "isActive": true
}
```

**Response (200):**
```json
{
  "success": true,
  "worker": { /* updated worker */ }
}
```

---

#### DELETE `/api/workers/[id]`

**Purpose:** Deactivate worker (soft delete)

**Response (200):**
```json
{
  "success": true,
  "message": "Worker deactivated"
}
```

---

### Attendance Endpoints

#### POST `/api/attendance/checkin`

**Purpose:** Check in worker

**Request:**
```json
{
  "workerId": "...",
  "facilityId": "..."
}
```

**Response (200):**
```json
{
  "success": true,
  "attendance": {
    "id": "...",
    "workerId": "...",
    "checkInTime": "2026-02-10T08:00:00.000Z",
    "status": "checked_in"
  }
}
```

---

#### POST `/api/attendance/checkout`

**Purpose:** Check out worker

**Request:**
```json
{
  "attendanceId": "..."
}
```

**Response (200):**
```json
{
  "success": true,
  "attendance": {
    "id": "...",
    "checkInTime": "2026-02-10T08:00:00.000Z",
    "checkOutTime": "2026-02-10T17:00:00.000Z",
    "hoursWorked": 9,
    "status": "completed"
  }
}
```

---

#### GET `/api/attendance/checkin`

**Purpose:** Get today's checked-in workers

**Response (200):**
```json
{
  "attendance": [
    {
      "id": "...",
      "worker": { /* worker object */ },
      "checkInTime": "2026-02-10T08:00:00.000Z",
      "status": "checked_in"
    }
  ]
}
```

---

### Sessions Endpoints

#### POST `/api/sessions`

**Purpose:** Create work session (exporter assignment)

**Request:**
```json
{
  "workerIds": ["...", "..."],
  "exporterId": "...",
  "startTime": "2026-02-10T08:00:00.000Z"
}
```

**Response (201):**
```json
{
  "success": true,
  "session": {
    "id": "...",
    "workers": [...],
    "exporter": {...},
    "startTime": "...",
    "status": "active"
  }
}
```

---

#### PUT `/api/sessions/[id]`

**Purpose:** End work session

**Request:**
```json
{
  "endTime": "2026-02-10T17:00:00.000Z"
}
```

**Response (200):**
```json
{
  "success": true,
  "session": { /* updated session */ }
}
```

---

### Bags Endpoints

#### POST `/api/bags`

**Purpose:** Record completed bag

**Request:**
```json
{
  "exporterId": "...",
  "workerIds": ["...", "...", "..."],
  "weight": 60,
  "qualityNotes": "Grade A"
}
```

**Response (201):**
```json
{
  "success": true,
  "bag": {
    "id": "...",
    "exporter": {...},
    "workers": [...],
    "weight": 60,
    "dateProcessed": "2026-02-10T10:30:00.000Z"
  }
}
```

---

#### GET `/api/bags`

**Purpose:** List bags with filtering

**Query Parameters:**
- `exporterId`: Filter by exporter
- `workerId`: Filter by worker
- `startDate`: Start date (ISO)
- `endDate`: End date (ISO)

**Response (200):**
```json
{
  "bags": [
    {
      "id": "...",
      "exporter": {...},
      "workers": [...],
      "weight": 60,
      "dateProcessed": "..."
    }
  ],
  "summary": {
    "totalBags": 150,
    "totalWeight": 9000
  }
}
```

---

## 🗄️ Database Schema

### Users Collection

```javascript
{
  _id: ObjectId,
  email: String (unique, required),
  password: String (hashed, required),
  name: String (required),
  phone: String,
  role: Enum ['admin', 'supervisor', 'exporter'] (required),
  exporterId: ObjectId (ref: Exporter, optional),
  facilityId: ObjectId (ref: Facility, optional),
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}

// Indexes:
// - email (unique)
// - role
// - isActive
```

---

### Workers Collection

```javascript
{
  _id: ObjectId,
  fullName: String (required),
  gender: Enum ['male', 'female', 'other'] (required),
  dateOfBirth: Date,
  ageRange: String,
  phone: String (required),
  nationalId: String,
  photo: String (base64 or URL),
  cooperativeId: ObjectId (ref: Cooperative, required),
  facilityId: ObjectId (ref: Facility, required),
  primaryRole: String,
  
  // Impact baseline (collected once)
  previousWorkType: Enum ['none', 'casual', 'seasonal', 'fixed'],
  avgDaysWorkedPerMonth: Number,
  typicalDailyEarnings: String,
  previousPaymentMethod: Enum ['cash', 'mobile_money', 'bank'],
  
  // Consent
  consentToStore: Boolean (required),
  consentToStoreTimestamp: Date,
  consentToReport: Boolean,
  consentToReportTimestamp: Date,
  
  // Status
  isActive: Boolean (default: true),
  enrollmentDate: Date,
  createdBy: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}

// Indexes:
// - phone
// - nationalId
// - cooperativeId, facilityId
// - isActive
// - fullName (text search)
```

---

### Attendance Collection

```javascript
{
  _id: ObjectId,
  workerId: ObjectId (ref: Worker, required),
  facilityId: ObjectId (ref: Facility, required),
  supervisorId: ObjectId (ref: User, required),
  date: Date (required, indexed),
  checkInTime: Date (required),
  checkOutTime: Date,
  hoursWorked: Number,
  status: Enum ['checked_in', 'checked_out', 'completed'],
  notes: String,
  createdAt: Date,
  updatedAt: Date
}

// Indexes:
// - workerId, date (compound, unique)
// - facilityId, date
// - status
```

---

### Sessions Collection

```javascript
{
  _id: ObjectId,
  attendanceId: ObjectId (ref: Attendance, required),
  workerId: ObjectId (ref: Worker, required),
  exporterId: ObjectId (ref: Exporter, required),
  facilityId: ObjectId (ref: Facility, required),
  startTime: Date (required),
  endTime: Date,
  status: Enum ['active', 'completed'],
  createdBy: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}

// Indexes:
// - workerId, exporterId
// - facilityId, startTime
// - status
```

---

### Bags Collection

```javascript
{
  _id: ObjectId,
  exporterId: ObjectId (ref: Exporter, required),
  workerIds: [ObjectId] (ref: Worker, required, min: 2, max: 4),
  sessionId: ObjectId (ref: Session),
  facilityId: ObjectId (ref: Facility, required),
  weight: Number (default: 60, kg),
  qualityNotes: String,
  dateProcessed: Date (default: now),
  recordedBy: ObjectId (ref: User),
  createdAt: Date
}

// Indexes:
// - exporterId, dateProcessed
// - workerIds (multi-key)
// - facilityId, dateProcessed
```

---

### Earnings Collection

```javascript
{
  _id: ObjectId,
  workerId: ObjectId (ref: Worker, required),
  attendanceId: ObjectId (ref: Attendance, required),
  date: Date (required),
  baseRate: Number (required),
  hoursWorked: Number,
  bagsCompleted: Number,
  bagBonus: Number,
  totalEarnings: Number (required),
  rateCardId: ObjectId (ref: RateCard),
  status: Enum ['pending', 'locked', 'paid'],
  overrideReason: String,
  overrideBy: ObjectId (ref: User),
  calculatedAt: Date,
  createdAt: Date
}

// Indexes:
// - workerId, date (compound)
// - status
// - calculatedAt
```

---

### Exporters Collection

```javascript
{
  _id: ObjectId,
  name: String (required),
  code: String (unique),
  contactPerson: String,
  email: String,
  phone: String,
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}

// Indexes:
// - code (unique)
// - name
```

---

### Cooperatives Collection

```javascript
{
  _id: ObjectId,
  name: String (required),
  code: String (unique),
  contactPerson: String,
  phone: String,
  address: String,
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}

// Indexes:
// - code (unique)
```

---

### Facilities Collection

```javascript
{
  _id: ObjectId,
  name: String (required),
  code: String (unique),
  location: String,
  cooperativeId: ObjectId (ref: Cooperative),
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}

// Indexes:
// - code (unique)
// - cooperativeId
```

---

### RateCards Collection

```javascript
{
  _id: ObjectId,
  name: String (required),
  baseRate: Number (required, RWF),
  bagBonus: Number (RWF),
  effectiveFrom: Date (required),
  effectiveTo: Date,
  facilityId: ObjectId (ref: Facility),
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}

// Indexes:
// - effectiveFrom, effectiveTo
// - facilityId
// - isActive
```

---

## 🔒 Security

### Authentication

**Method:** JWT (JSON Web Tokens)

**Storage:** HTTP-only cookies

**Token Payload:**
```javascript
{
  userId: "...",
  email: "...",
  role: "...",
  exporterId: "..." (if applicable),
  facilityId: "..." (if applicable),
  iat: 1234567890,
  exp: 1234567890
}
```

**Token Expiry:** 7 days

**Refresh Strategy:** Currently manual (login again after expiry)

---

### Password Security

**Hashing:** bcryptjs with 10 salt rounds

**Minimum Length:** 6 characters

**Storage:** Never stored in plain text

**Change Password:** Requires current password verification

---

### Role-Based Access Control (RBAC)

**Implemented in:** Middleware (`src/middleware.ts`)

**Access Matrix:**

| Route | Supervisor | Admin | Exporter |
|-------|-----------|-------|----------|
| /supervisor/* | ✅ | ✅ | ❌ |
| /admin/* | ❌ | ✅ | ❌ |
| /exporter/* | ❌ | ✅ | ✅ |
| /api/workers | ✅ | ✅ | ❌ |
| /api/attendance | ✅ | ✅ | ❌ |
| /api/bags | ✅ | ✅ | Read-only |

---

### Data Protection

**Encryption at Rest:** MongoDB encryption (production)

**Encryption in Transit:** HTTPS (production)

**Cookie Security:**
- `httpOnly: true` - Prevents XSS access
- `secure: true` - HTTPS only (production)
- `sameSite: 'lax'` - CSRF protection

**Input Validation:** Zod schemas on all forms

**SQL Injection Prevention:** Mongoose ODM parameterized queries

---

### Audit Trail

**Logged Actions:**
- User login/logout
- Worker onboarding
- Attendance changes
- Bag records
- Earnings overrides
- Profile updates
- Password changes

**Log Fields:**
- Action type
- User ID
- Timestamp
- IP address
- Before/after values (for updates)

**Access:** Admin only via `/api/audit` endpoint

---

## 🐛 Troubleshooting

### Login Issues

**Problem:** "Invalid email or password"

**Solutions:**
1. Check email spelling
2. Verify password (case-sensitive)
3. Ensure account is active
4. Try default credentials from seed data

**Problem:** Redirect loop after login

**Solutions:**
1. Clear browser cookies
2. Check JWT_SECRET in .env.local
3. Restart dev server
4. Check middleware logs for token verification errors

---

### Database Connection

**Problem:** "MongoDB connection failed"

**Solutions:**
1. Verify MONGODB_URI in .env.local
2. Check MongoDB is running: `mongosh`
3. Test connection: `mongosh <your_connection_string>`
4. Check firewall/network restrictions

---

### Worker Onboarding

**Problem:** "Phone number already exists"

**Solutions:**
1. Search existing workers first
2. Use different phone number
3. Contact admin to check duplicate records

**Problem:** Photo upload fails

**Solutions:**
1. Check file size (max 5MB)
2. Use supported formats (JPEG, PNG)
3. Grant camera permissions in browser

---

### Attendance Issues

**Problem:** "Worker already checked in"

**Solutions:**
1. Check "Checked In Workers" list
2. Check out worker first
3. Wait until midnight for new day

**Problem:** Cannot check out worker

**Solutions:**
1. Verify worker is checked in
2. Check attendance ID is correct
3. Contact admin for manual checkout

---

## 🚀 Deployment

### Production Checklist

**Before Deployment:**

✅ Update environment variables:
```env
NODE_ENV=production
MONGODB_URI=<atlas_connection_string>
JWT_SECRET=<strong_random_secret>
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

✅ Update `next.config.ts`:
```typescript
const nextConfig = {
  env: {
    JWT_SECRET: process.env.JWT_SECRET,
  },
  // Add domain for Image optimization
  images: {
    domains: ['yourdomain.com'],
  },
};
```

✅ Build the application:
```bash
npm run build
```

✅ Test production build locally:
```bash
npm start
```

---

### Deploy to Vercel

**Step 1:** Install Vercel CLI
```bash
npm i -g vercel
```

**Step 2:** Login
```bash
vercel login
```

**Step 3:** Deploy
```bash
vercel --prod
```

**Step 4:** Add Environment Variables in Vercel Dashboard:
- Go to Project Settings → Environment Variables
- Add all variables from .env.local
- Redeploy

---

### Deploy to Custom Server

**Requirements:**
- Node.js 18+ runtime
- MongoDB database
- Reverse proxy (Nginx/Apache)
- SSL certificate

**Steps:**

1. **Build:**
```bash
npm run build
```

2. **Transfer files to server:**
```bash
scp -r .next package.json server:/var/www/cwms/
```

3. **Install dependencies on server:**
```bash
cd /var/www/cwms
npm install --production
```

4. **Set up PM2 (process manager):**
```bash
npm i -g pm2
pm2 start npm --name cwms -- start
pm2 save
pm2 startup
```

5. **Configure Nginx:**
```nginx
server {
    listen 80;
    server_name cwms.example.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

6. **SSL with Let's Encrypt:**
```bash
sudo certbot --nginx -d cwms.example.com
```

---

## 📞 Support

**Documentation:** This file + inline code comments

**Issues:** Report bugs via GitHub Issues (if applicable)

**Contact:** 
- Technical: Enock (Developer)
- Product: Kaawa (Product Lead)

---

## 📄 License

Proprietary - Iwacu Cooperative & CWMS Team

---

**Version History:**

- **v2.1** (Feb 10, 2026) - Added profile management, comprehensive documentation
- **v2.0** (Jan 30, 2026) - Authentication fixes, middleware improvements
- **v1.0** (Jan 15, 2026) - Initial production release

---

**End of Documentation**
