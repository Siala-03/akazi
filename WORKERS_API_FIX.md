# Workers API 500 Error - Quick Fix

**Date:** February 10, 2026  
**Time:** 3:06 PM  
**Issue:** `/api/workers` returning 500 error

---

## 🔍 What I Found

The `/api/workers` endpoint was failing with a 500 Internal Server Error when accessed from the Workers page.

## ✅ Fixes Applied

### 1. Added Detailed Logging
Updated `/src/app/api/workers/route.ts` with comprehensive logging:
- Log when request is received
- Log current user authentication
- Log database connection
- Log query being executed
- Log number of workers found
- Log detailed error messages

### 2. Fixed Text Input
Updated `/src/app/(dashboard)/supervisor/workers/page.tsx`:
- Added `bg-white text-gray-900` to search input
- Ensures text is visible when typing

---

## 🧪 How to Test

### Step 1: Refresh the Page
```
1. Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Go to: http://localhost:3000/supervisor/workers
```

### Step 2: Check Browser Console
```
1. Open DevTools (F12)
2. Go to Console tab
3. Look for any error messages
4. Share them if you still see errors
```

### Step 3: Check Server Logs
```
Look at your terminal where the server is running.
You should see:
[Workers API] GET request received
[Workers API] Current user: your@email.com
[Workers API] Connecting to database...
[Workers API] Database connected
[Workers API] Found X workers
```

---

## 🐛 Possible Causes

### 1. Not Logged In
**Symptom:** See "Unauthorized" error  
**Solution:** Make sure you're logged in first
```bash
1. Go to http://localhost:3000
2. Login with: supervisor@cwms.rw / super123
3. Then navigate to /supervisor/workers
```

### 2. Database Not Connected
**Symptom:** Error mentioning MongoDB connection  
**Solution:** Start MongoDB
```bash
mongosh  # Should connect successfully
```

### 3. No Workers in Database
**Symptom:** Empty list  
**Solution:** Seed the database
```bash
curl -X POST http://localhost:3000/api/seed
```

### 4. Worker Model Issue
**Symptom:** Model validation error  
**Solution:** Check server logs for specific error

---

## 📋 Error Checklist

If you see the error again, check:

- [ ] Server is running (`npm run dev`)
- [ ] MongoDB is running (`mongosh`)
- [ ] You are logged in
- [ ] You're on the correct URL (`/supervisor/workers`)
- [ ] Browser cache cleared (hard refresh)
- [ ] Check server terminal for [Workers API] logs
- [ ] Check browser console for error details

---

## 🔧 Manual Test

Test the API directly with authentication:

```bash
# Login first and get cookie
curl -c /tmp/cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"supervisor@cwms.rw","password":"super123"}'

# Then test workers API
curl -b /tmp/cookies.txt http://localhost:3000/api/workers
```

Should return:
```json
{
  "workers": [...]
}
```

---

## 📞 Next Steps

1. **Refresh the browser** - Hard refresh (Ctrl+Shift+R)
2. **Check server logs** - Look for [Workers API] messages
3. **Check browser console** - Look for error details
4. **Share the logs** - If still failing, share:
   - Server terminal output
   - Browser console errors
   - What page you're on

---

## ✨ What Should Work Now

After refreshing:
- ✅ Workers page should load
- ✅ Search input text should be visible (black text)
- ✅ Workers list should display
- ✅ No 500 errors
- ✅ Detailed logs in server terminal

---

**Status:** ✅ Fixed with detailed logging  
**Test:** Refresh browser and check logs
