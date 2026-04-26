# CWMS - Casual Worker Management System

A comprehensive digital platform for managing casual workers in Rwanda's coffee sorting industry, built with Next.js and MongoDB.

## 🎯 Overview

CWMS digitizes the casual worker management process, providing:
- **Fast worker onboarding** (≤5 minutes)
- **Attendance tracking** with check-in/check-out
- **Work session management** with exporter assignments
- **Transparent earnings calculation** based on bags processed
- **Role-based access** for supervisors, admins, and exporters
- **Comprehensive reporting** and analytics

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB database
- npm or yarn

### Installation

```bash
# Clone the repository
cd /home/enock/ikawa

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your MongoDB URI and JWT secret

# Seed the database
curl -X POST http://localhost:3000/api/seed

# Start development server
npm run dev
```

Visit: **http://localhost:3000**

## 🔑 Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@cwms.rw | admin123 |
| Supervisor | supervisor@cwms.rw | super123 |
| Exporter | exporter@rwandacoffee.rw | exporter123 |

## 📁 Project Structure

```
ikawa/
├── src/
│   ├── app/
│   │   ├── (auth)/           # Authentication pages
│   │   ├── (dashboard)/      # Role-based dashboards
│   │   │   ├── admin/        # Admin pages
│   │   │   ├── supervisor/   # Supervisor pages
│   │   │   └── exporter/     # Exporter pages
│   │   └── api/              # API routes
│   ├── models/               # Mongoose models
│   ├── lib/                  # Utilities
│   └── middleware.ts         # Auth middleware
├── TESTING_GUIDE.md          # Comprehensive testing guide
└── package.json
```

## ✨ Features

### For Supervisors
- 👥 **Worker Onboarding**: Quick registration with consent management
- ✅ **Daily Operations**: Check-in/out, exporter assignments, bag recording
- 📊 **Dashboard**: Real-time stats and trends
- 🔍 **Worker Directory**: Search and view all registered workers

### For Admins
- 🛠️ **User Management**: CRUD operations for workers and exporters
- 📈 **Reports**: Attendance, earnings, and productivity analytics
- 🎛️ **System Control**: Activate/deactivate users, manage access
- 📋 **Comprehensive Dashboard**: System-wide statistics

### For Exporters
- 👁️ **Read-Only Access**: View bags processed and workers engaged
- 📦 **Bag History**: Track all processed bags
- 📊 **Statistics**: Engagement metrics and totals

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - New user registration
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Current user info

### Workers
- `GET /api/workers` - List all workers (with search/filter)
- `POST /api/workers` - Create new worker
- `GET /api/workers/[id]` - Get specific worker
- `PUT /api/workers/[id]` - Update worker
- `DELETE /api/workers/[id]` - Deactivate worker

### Exporters
- `GET /api/exporters` - List all exporters
- `POST /api/exporters` - Create new exporter
- `GET /api/exporters/[id]` - Get specific exporter
- `PUT /api/exporters/[id]` - Update exporter
- `DELETE /api/exporters/[id]` - Deactivate exporter

### Attendance
- `POST /api/attendance/checkin` - Check-in worker
- `POST /api/attendance/checkout` - Check-out worker
- `GET /api/attendance/checkin` - Get today's attendance

### Sessions & Bags
- `POST /api/sessions` - Create work session
- `GET /api/sessions` - List active sessions
- `PUT /api/sessions/[id]` - End session
- `POST /api/bags` - Record completed bag
- `GET /api/bags` - List bags (filtered by exporter/date)

### Reports
- `GET /api/reports/attendance` - Attendance analytics
- `GET /api/reports/earnings` - Earnings by worker/exporter
- `GET /api/reports/productivity` - Productivity metrics

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT with HTTP-only cookies
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod validation
- **Notifications**: React Hot Toast

## 🧪 Testing

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for comprehensive testing instructions including:
- Test credentials
- Workflow walkthroughs
- API testing examples
- Demo script for presentations

## 📊 Database Models

- **User**: System users (admin, supervisor, exporter)
- **Worker**: Casual workers with demographics and contact info
- **Cooperative**: Worker cooperatives
- **Facility**: Sorting facilities
- **Exporter**: Coffee exporters
- **Attendance**: Daily check-in/out records
- **Session**: Work sessions (worker-exporter assignments)
- **Bag**: Processed coffee bags with worker associations
- **RateCard**: Earnings rate configuration

## 🔐 Security

- JWT-based authentication
- HTTP-only cookies for token storage
- Role-based access control (RBAC)
- Password hashing with bcryptjs
- Protected API routes
- Input validation with Zod

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop (1920px+)
- Laptop (1024px+)
- Tablet (768px+)
- Mobile (320px+)

## 🌍 Environment Variables

```env
# .env.local
MONGODB_URI=mongodb://localhost:27017/cwms
JWT_SECRET=your-super-secret-jwt-key-change-in-production
NODE_ENV=development
```

## 🚀 Deployment

### Build for Production

```bash
npm run build
npm start
```

### Environment Setup
1. Set production MongoDB URI
2. Generate secure JWT secret
3. Set NODE_ENV=production
4. Configure CORS if needed

## 📈 Performance

- Server-side rendering for fast initial load
- API route caching where appropriate
- MongoDB indexes for query optimization
- Lazy loading for dashboard components

## 🤝 Contributing

This is a demo/portfolio project. For questions or collaboration:
1. Review the code structure
2. Check TESTING_GUIDE.md for workflows
3. Test locally before deployment

## 📄 License

This project is for demonstration purposes.

## 👨‍💻 Developer

Built by Enock for the Rwanda coffee industry digital transformation initiative.

---

**For detailed testing instructions, see [TESTING_GUIDE.md](./TESTING_GUIDE.md)**
