# CWMS Testing Guide

## 🚀 Quick Start

### Start the Application

```bash
cd /home/enock/ikawa
npm run dev
```

The application will be available at: **http://localhost:3000**

---

## 🔑 Test Credentials

### Admin Account
- **Email**: `admin@cwms.rw`
- **Password**: `admin123`
- **Access**: Full system access, user management, reports

### Supervisor Account
- **Email**: `supervisor@cwms.rw`
- **Password**: `super123`
- **Access**: Worker onboarding, daily operations, attendance management

### Exporter Account
- **Email**: `exporter@rwandacoffee.rw`
- **Password**: `exporter123`
- **Access**: Read-only view of bags and workers

---

## 📊 Database Setup

### Seed the Database

```bash
curl -X POST http://localhost:3000/api/seed
```

This creates:
- ✅ 15 sample workers
- ✅ 3 exporters
- ✅ 2 cooperatives
- ✅ 1 facility
- ✅ 10 attendance records
- ✅ 6 active sessions
- ✅ 3 completed bags
- ✅ 1 rate card (1000 RWF/bag)

**Note**: If you need to re-seed, drop the database first:
```bash
# In MongoDB
use cwms
db.dropDatabase()
```

---

## 🧪 Testing Workflows

### 1. Supervisor Workflow

#### Login
1. Navigate to http://localhost:3000/login
2. Enter supervisor credentials
3. Verify redirect to `/supervisor/dashboard`

#### Onboard a New Worker
1. Click **"Onboard Worker"** or navigate to `/supervisor/onboarding`
2. Fill in the form:
   - Full Name: Test Worker
   - Gender: Select any
   - Phone: +250788123456
   - Primary Role: Coffee Sorter
3. Check the consent checkbox
4. Click **"Complete Onboarding"**
5. Verify success message and redirect

#### Daily Operations
1. Navigate to `/supervisor/operations`
2. **Check-in a Worker**:
   - Go to "Check-in" tab
   - Click "Check In" for any active worker
   - Verify success toast
3. **Assign to Exporter**:
   - Go to "Assign Exporter" tab
   - Select an exporter from dropdown for checked-in worker
   - Verify session created
4. **Record a Bag**:
   - Go to "Record Bags" tab
   - Select an exporter
   - Select 2-4 workers (must be on-site)
   - Enter weight (default 60kg)
   - Click "Record Bag"
   - Verify success message
5. **Check-out a Worker**:
   - Go to "Check-out" tab
   - Click "Check Out" for any on-site worker
   - Verify success toast

#### View Workers
1. Navigate to `/supervisor/workers`
2. Use search to find workers
3. View worker cards with details

---

### 2. Admin Workflow

#### Login
1. Navigate to http://localhost:3000/login
2. Enter admin credentials
3. Verify redirect to `/admin/dashboard`

#### Manage Workers
1. Navigate to `/admin/workers`
2. **Search Workers**:
   - Type in search box (name, ID, or phone)
   - Verify filtered results
3. **Filter by Status**:
   - Select "Active" or "Inactive"
   - Verify filtered results
4. **Edit Worker**:
   - Click "Edit" on any worker
   - Modify details in modal
   - Click "Save Changes"
   - Verify success toast
5. **Deactivate Worker**:
   - Click "Deactivate" on active worker
   - Verify status changes to inactive

#### Manage Exporters
1. Navigate to `/admin/exporters`
2. **Add New Exporter**:
   - Click "+ Add Exporter"
   - Fill in form:
     - Exporter Code: EXP004
     - Company Name: Test Exporter Ltd
     - Contact Person: John Doe
     - Phone: +250788999888
     - Email: test@exporter.com
   - Click "Add Exporter"
   - Verify new card appears
3. **Edit Exporter**:
   - Click "Edit" on any exporter card
   - Modify details
   - Click "Save Changes"
4. **Toggle Status**:
   - Click "Deactivate" or "Activate"
   - Verify status badge changes

#### View Reports
1. Navigate to `/admin/reports`
2. View system statistics
3. View trend charts

---

### 3. Exporter Workflow

#### Login
1. Navigate to http://localhost:3000/login
2. Enter exporter credentials
3. Verify redirect to `/exporter/dashboard`

#### View Data
1. Check total bags processed
2. Check workers engaged
3. View recent bags list
4. Note the read-only access message

---

## 🔌 API Testing

### Authentication

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"supervisor@cwms.rw","password":"super123"}'
```

### Workers API

```bash
# Get all workers
curl http://localhost:3000/api/workers \
  -H "Cookie: token=YOUR_TOKEN"

# Search workers
curl "http://localhost:3000/api/workers?search=John" \
  -H "Cookie: token=YOUR_TOKEN"

# Get specific worker
curl http://localhost:3000/api/workers/WORKER_ID \
  -H "Cookie: token=YOUR_TOKEN"

# Update worker
curl -X PUT http://localhost:3000/api/workers/WORKER_ID \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_TOKEN
  
```bash
# Check-in worker
curl -X POST http://localhost:3000/api/attendance/checkin \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_TOKEN" \
  -d '{"workerId":"WORKER_ID"}'

# Check-out worker
curl -X POST http://localhost:3000/api/attendance/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_TOKEN" \
  -d '{"attendanceId":"ATTENDANCE_ID"}'

# Get today's attendance
curl http://localhost:3000/api/attendance/checkin \
  -H "Cookie: token=YOUR_TOKEN"
```

### Reports API

```bash
# Attendance Report
curl "http://localhost:3000/api/reports/attendance?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Cookie: token=YOUR_TOKEN"

# Earnings Report
curl "http://localhost:3000/api/reports/earnings?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Cookie: token=YOUR_TOKEN"

# Productivity Report
curl "http://localhost:3000/api/reports/productivity?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Cookie: token=YOUR_TOKEN"
```

---

## ✅ Feature Checklist

### Authentication & Authorization
- [x] Login with email/password
- [x] JWT token generation
- [x] HTTP-only cookie storage
- [x] Role-based redirects
- [x] Protected routes (middleware)
- [x] Logout functionality

### Supervisor Features
- [x] Dashboard with stats and charts
- [x] Worker onboarding (≤5 min target)
- [x] Daily operations (check-in/out)
- [x] Exporter assignment
- [x] Bag recording (2-4 workers)
- [x] Workers directory

### Admin Features
- [x] System dashboard
- [x] Workers management (CRUD)
- [x] Exporters management (CRUD)
- [x] Search and filters
- [x] Status toggling
- [x] Reports access

### Exporter Features
- [x] Read-only dashboard
- [x] Bags view (own data only)
- [x] Workers engaged stats

### Data Management
- [x] Worker registration
- [x] Attendance tracking
- [x] Session management
- [x] Bag recording
- [x] Earnings calculation

### Reports & Analytics
- [x] Attendance reports
- [x] Earnings reports
- [x] Productivity metrics
- [x] Date range filtering

---

## 🐛 Known Issues

### Minor Warnings (Non-Critical)
1. **Mongoose Index Warning**: Duplicate schema index on `code` field
   - **Impact**: None (informational)
   - **Fix**: Remove redundant index definitions in models

2. **Next.js Middleware Deprecation**: "middleware" → "proxy"
   - **Impact**: None currently
   - **Future**: May need migration

### To Verify
- [ ] Complete supervisor workflow end-to-end
- [ ] Multi-user concurrent access
- [ ] Data persistence across restarts

---

## 📱 Page URLs

### Authentication
- Login: `/login`
- Register: `/register`

### Supervisor
- Dashboard: `/supervisor/dashboard`
- Operations: `/supervisor/operations`
- Onboarding: `/supervisor/onboarding`
- Workers: `/supervisor/workers`

### Admin
- Dashboard: `/admin/dashboard`
- Workers: `/admin/workers`
- Exporters: `/admin/exporters`
- Reports: `/admin/reports`

### Exporter
- Dashboard: `/exporter/dashboard`

---

## 💡 Tips for Interview/Demo

1. **Start with the problem**: Casual workers lack digital records
2. **Show the flow**: Onboard → Check-in → Assign → Record bags → Check-out
3. **Highlight speed**: Onboarding takes ≤5 minutes
4. **Emphasize auditability**: All records timestamped and trackable
5. **Demo role-based access**: Show different dashboards per role
6. **Showcase reports**: Real-time analytics and earnings calculation
7. **Mention scalability**: MongoDB for flexibility, Next.js for performance

### Demo Script
1. **Login as Supervisor** → Show dashboard stats
2. **Onboard a worker** → Quick form, consent capture
3. **Check-in the worker** → Real-time status update
4. **Assign to exporter** → Create work session
5. **Record a bag** → Select workers, automatic earnings calculation
6. **Switch to Admin** → Show management capabilities
7. **Edit worker details** → Demonstrate CRUD
8. **View reports** → Analytics and insights
9. **Switch to Exporter** → Read-only view

---

## 🎯 Success Metrics

The application successfully provides:
- ✅ Digital worker registration
- ✅ Attendance tracking
- ✅ Work session management
- ✅ Earnings calculation (transparent & fair)
- ✅ Multi-role access control
- ✅ Comprehensive reporting
- ✅ Fast onboarding (≤5 min)
- ✅ Audit trail for all operations

---

## 🔧 Environment

- **Framework**: Next.js 16
- **Database**: MongoDB
- **Authentication**: JWT + HTTP-only cookies
- **UI**: React with TailwindCSS
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod

---

## 📞 Support

For issues or questions:
1. Check the console for error messages
2. Verify MongoDB is running
3. Ensure `.env.local` has correct credentials
4. Check network tab for API responses
5. Review browser console for client-side errors

**Environment Variables Required**:
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```
