# CWMS Quick Reference Guide

**Last Updated:** February 10, 2026

---

## 🔐 Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@cwms.rw | admin123 |
| **Supervisor** | supervisor@cwms.rw | super123 |
| **Exporter** | exporter@rwandacoffee.rw | exporter123 |

⚠️ **Change passwords after first login!**

---

## 🚀 Quick Start (5 Minutes)

```bash
# 1. Start MongoDB
mongosh  # Verify it's running

# 2. Navigate to project
cd /home/enock/ikawa

# 3. Start server
npm run dev

# 4. Open browser
http://localhost:3000

# 5. Login with supervisor account
# Email: supervisor@cwms.rw
# Password: super123
```

---

## 📱 Supervisor Daily Workflow

### Morning (8:00 AM)

1. **Login** → Navigate to Dashboard
2. **Check In Workers:**
   - Go to "Daily Operations"
   - Click "Check In Worker"
   - Search worker by name
   - Confirm check-in
   - Repeat for all workers

### During Work (9:00 AM - 5:00 PM)

3. **Assign to Exporters:**
   - Select workers
   - Choose exporter
   - Click "Assign"

4. **Record Bags:**
   - Click "Record Bag"
   - Select exporter
   - Select 2-4 workers
   - Confirm

### Evening (5:00 PM)

5. **Check Out Workers:**
   - View checked-in list
   - Click "Check Out" for each
   - Verify hours worked

### Weekly

6. **Onboard New Workers:**
   - Go to "Onboarding"
   - Fill required fields (5 min)
   - Take photo
   - Submit

---

## 🔧 Common Tasks

### Reset User Password (Admin)

```bash
# Via MongoDB shell
mongosh cwms

use cwms
db.users.find({email: "user@cwms.rw"})
# Then use admin panel to reset
```

### Check Today's Attendance

```bash
# Navigate to:
/supervisor/operations

# Or API:
curl http://localhost:3000/api/attendance/checkin
```

### Export Worker Data

```bash
# Navigate to:
/admin/reports

# Select date range → Download CSV
```

### View Earnings

```bash
# Navigate to:
/supervisor/workers

# Click worker name → View earnings tab
```

---

## 🐛 Quick Fixes

### "Login not working"

```bash
# 1. Clear cookies
# Browser → F12 → Application → Cookies → Delete all

# 2. Restart server
pkill -f "next dev"
npm run dev

# 3. Check logs
# Server terminal should show:
# [Login API] ✓ Cookie set successfully
```

### "Worker already checked in"

```bash
# Check current status:
curl http://localhost:3000/api/attendance/checkin

# Manual checkout (Admin only):
# Go to /admin/attendance
# Find worker → Force checkout
```

### "Cannot add bag"

**Check:**
- ✅ Workers are checked in
- ✅ Workers assigned to exporter
- ✅ Selected 2-4 workers
- ✅ Exporter is selected

---

## 📊 Dashboard Metrics

### Supervisor Dashboard Shows:

- **Total Workers:** All registered workers
- **Checked In Today:** Current attendance
- **Bags Processed:** Today's output
- **Active Exporters:** Exporters with assignments

### Admin Dashboard Shows:

- **System-wide stats:** All facilities
- **User management:** Create/edit users
- **Reports:** Advanced analytics
- **Audit logs:** System activity

---

## 🔗 Important URLs

| Page | URL |
|------|-----|
| Login | http://localhost:3000/login |
| Supervisor Dashboard | http://localhost:3000/supervisor/dashboard |
| Admin Dashboard | http://localhost:3000/admin/dashboard |
| Worker Onboarding | http://localhost:3000/supervisor/onboarding |
| Daily Operations | http://localhost:3000/supervisor/operations |
| Profile | http://localhost:3000/supervisor/profile |

---

## 📞 API Quick Reference

### Check Worker In

```bash
curl -X POST http://localhost:3000/api/attendance/checkin \
  -H "Content-Type: application/json" \
  -b "token=YOUR_TOKEN" \
  -d '{
    "workerId": "WORKER_ID",
    "facilityId": "FACILITY_ID"
  }'
```

### Record Bag

```bash
curl -X POST http://localhost:3000/api/bags \
  -H "Content-Type: application/json" \
  -b "token=YOUR_TOKEN" \
  -d '{
    "exporterId": "EXPORTER_ID",
    "workerIds": ["WORKER1", "WORKER2"],
    "weight": 60
  }'
```

### Get Today's Stats

```bash
curl http://localhost:3000/api/reports/daily \
  -b "token=YOUR_TOKEN"
```

---

## 🎯 Performance Tips

1. **Use search instead of scrolling** - Worker directory has instant search
2. **Bulk check-in** - Use barcode scanner (if available)
3. **Pre-assign exporters** - Do it in morning for whole day
4. **Record bags in batches** - Enter multiple bags at once

---

## 🔒 Security Best Practices

✅ **Do:**
- Change default passwords immediately
- Log out when leaving computer
- Use strong passwords (8+ chars)
- Report suspicious activity

❌ **Don't:**
- Share login credentials
- Leave browser open unattended
- Use public WiFi without VPN
- Write passwords on paper

---

## 📱 Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Search workers | `Ctrl + K` |
| Quick check-in | `Ctrl + I` |
| Record bag | `Ctrl + B` |
| Logout | `Ctrl + L` |

*(If implemented)*

---

## 🌟 Feature Requests

**Planned for Phase 2:**
- Mobile app for workers
- SMS notifications
- Payment integration
- Biometric check-in
- Advanced analytics
- Multi-language support

**Request new features:** Contact Kaawa or Enock

---

## 📚 More Documentation

- **Full Documentation:** [PLATFORM_DOCUMENTATION.md](./PLATFORM_DOCUMENTATION.md)
- **Testing Guide:** [TESTING_GUIDE.md](./TESTING_GUIDE.md)
- **Sign-in Fixes:** [SIGNIN_FIXES.md](./SIGNIN_FIXES.md)
- **Platform Improvements:** [PLATFORM_IMPROVEMENTS.md](./PLATFORM_IMPROVEMENTS.md)

---

**Questions?** Check the full documentation or contact the development team!
