# Platform Improvement Recommendations

## Overview
This document provides actionable recommendations to improve the CWMS (Casual Worker Management System) platform based on codebase analysis and best practices.

---

## 🔴 Critical Improvements (High Priority)

### 1. Add Authentication State Management
**Current Issue**: No centralized auth state management, each component fetches user data independently.

**Recommendation**: Add React Context for authentication
```typescript
// src/contexts/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'supervisor' | 'exporter';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

### 2. Fix Environment Variable Warning
**Current Issue**: Non-standard NODE_ENV value causing warnings.

**Solution**: Check and fix .env.local
```bash
# .env.local - Ensure exactly:
NODE_ENV=development  # NOT "dev" or anything else
MONGODB_URI=mongodb://localhost:27017/cwms
JWT_SECRET=your-secret-key-here
```

### 3. Add API Error Handling Interceptor
**Current Issue**: Inconsistent error handling across API calls.

**Recommendation**: Create API utility wrapper
```typescript
// src/lib/api.ts
export async function apiCall<T>(
  url: string,
  options?: RequestInit
): Promise<{ data?: T; error?: string }> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: data.error || 'Request failed' };
    }

    return { data };
  } catch (error) {
    console.error('API call failed:', error);
    return { error: 'Network error. Please try again.' };
  }
}

// Usage:
const { data, error } = await apiCall('/api/workers', { method: 'GET' });
if (error) {
  toast.error(error);
  return;
}
// Use data...
```

---

## 🟡 Important Improvements (Medium Priority)

### 4. Add Form Validation Schema
**Current Issue**: Inline validation is harder to maintain.

**Recommendation**: Use Zod schemas (already installed)
```typescript
// src/lib/validations/auth.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
  role: z.enum(['supervisor', 'admin', 'exporter']),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
```

### 5. Add Session Timeout & Auto-logout
**Current Issue**: No automatic session timeout.

**Recommendation**: Add inactivity detection
```typescript
// src/hooks/useSessionTimeout.ts
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export function useSessionTimeout(timeoutMs = 30 * 60 * 1000) { // 30 min
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout>();

  const resetTimeout = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login?reason=timeout');
    }, timeoutMs);
  };

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      document.addEventListener(event, resetTimeout);
    });

    resetTimeout(); // Initial setup

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimeout);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [timeoutMs]);
}

// Use in dashboard layouts:
useSessionTimeout(30 * 60 * 1000); // 30 minutes
```

### 6. Add Loading Skeletons
**Current Issue**: No loading indicators for data fetching.

**Recommendation**: Add skeleton components
```typescript
// src/components/ui/Skeleton.tsx
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
```

### 7. Add Database Indexes
**Current Issue**: No database indexes for common queries.

**Recommendation**: Add to models
```typescript
// In models/Worker.ts, add:
WorkerSchema.index({ email: 1 });
WorkerSchema.index({ nationalId: 1 });
WorkerSchema.index({ phone: 1 });
WorkerSchema.index({ isActive: 1 });
WorkerSchema.index({ facilityId: 1, isActive: 1 });

// In models/Attendance.ts:
AttendanceSchema.index({ workerId: 1, date: -1 });
AttendanceSchema.index({ facilityId: 1, date: -1 });

// In models/Bag.ts:
BagSchema.index({ workerId: 1, dateProcessed: -1 });
BagSchema.index({ exporterId: 1, dateProcessed: -1 });
```

---

## 🟢 Nice-to-Have Improvements (Low Priority)

### 8. Add PWA Support
**Current Issue**: Not installable as mobile app.

**Recommendation**: Add PWA manifest
```json
// public/manifest.json
{
  "name": "CWMS - Casual Worker Management System",
  "short_name": "CWMS",
  "description": "Coffee sorting facility worker management",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#10b981",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 9. Add Dark Mode
**Current Issue**: Only light theme available.

**Recommendation**: Use next-themes
```bash
npm install next-themes
```

```typescript
// src/app/layout.tsx
import { ThemeProvider } from 'next-themes';

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### 10. Add Data Export Functionality
**Current Issue**: No way to export reports as CSV/PDF.

**Recommendation**: Add export utilities
```typescript
// src/lib/export.ts
export function exportToCSV(data: any[], filename: string) {
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => Object.values(row).join(','));
  const csv = [headers, ...rows].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
}

// Usage in reports:
<button onClick={() => exportToCSV(reportData, 'attendance-report')}>
  Export CSV
</button>
```

---

## 🔧 Code Quality Improvements

### 11. Add TypeScript Strict Mode
**Current Issue**: Loose TypeScript configuration.

**Recommendation**: Update tsconfig.json
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### 12. Add ESLint Rules
**Current Issue**: Minimal linting rules.

**Recommendation**: Enhance eslint.config.mjs
```javascript
export default {
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  }
}
```

### 13. Add Component Tests
**Current Issue**: No automated tests.

**Recommendation**: Add Vitest + React Testing Library
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

```typescript
// src/__tests__/Login.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import LoginPage from '@/app/(auth)/login/page';

describe('Login Page', () => {
  it('renders login form', () => {
    render(<LoginPage />);
    expect(screen.getByText('CWMS Login')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
  });

  it('shows error on invalid credentials', async () => {
    render(<LoginPage />);
    // Add test logic
  });
});
```

---

## 📊 Monitoring & Analytics

### 14. Add Error Tracking
**Recommendation**: Integrate Sentry or similar
```bash
npm install @sentry/nextjs
```

### 15. Add Performance Monitoring
**Recommendation**: Use Web Vitals
```typescript
// src/app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### 16. Add Audit Logging
**Recommendation**: Log important actions
```typescript
// src/models/AuditLog.ts
import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: String, // 'LOGIN', 'CREATE_WORKER', 'UPDATE_BAG', etc.
  resource: String, // 'Worker', 'Bag', 'Session'
  resourceId: mongoose.Schema.Types.ObjectId,
  details: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
```

---

## 🚀 Performance Optimizations

### 17. Add React Query for Data Fetching
**Recommendation**: Replace raw fetch with React Query
```bash
npm install @tanstack/react-query
```

```typescript
// Provides caching, refetching, and better UX
import { useQuery } from '@tanstack/react-query';

function WorkersList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      const res = await fetch('/api/workers');
      return res.json();
    },
  });

  if (isLoading) return <Skeleton />;
  if (error) return <Error />;
  return <WorkersTable data={data} />;
}
```

### 18. Optimize Images
**Recommendation**: Use Next.js Image component
```typescript
import Image from 'next/image';

<Image 
  src="/logo.png" 
  alt="CWMS Logo" 
  width={40} 
  height={40}
  priority // for above-the-fold images
/>
```

### 19. Add API Route Caching
**Recommendation**: Cache expensive queries
```typescript
// In API routes:
export const revalidate = 60; // Revalidate every 60 seconds

// Or use Redis for more control:
import { cache } from '@/lib/redis';

const cachedData = await cache.get('workers-list');
if (cachedData) return cachedData;

const freshData = await fetchFromDB();
await cache.set('workers-list', freshData, 60);
```

---

## 📱 Mobile Experience

### 20. Improve Touch Targets
**Current Issue**: Some buttons too small for mobile.

**Recommendation**: Ensure minimum 44x44px touch targets
```typescript
// Update button classes:
className="min-h-[44px] min-w-[44px] px-4 py-2 ..."
```

### 21. Add Pull-to-Refresh
**Recommendation**: Add mobile pull-to-refresh
```typescript
// src/hooks/usePullToRefresh.ts
import { useEffect, useRef } from 'react';

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const startY = useRef(0);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      startY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = async (e: TouchEvent) => {
      const endY = e.changedTouches[0].clientY;
      if (endY - startY.current > 100 && window.scrollY === 0) {
        await onRefresh();
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh]);
}
```

---

## 🔐 Security Enhancements

### 22. Add Rate Limiting
**Recommendation**: Protect against brute force
```typescript
// src/lib/rateLimit.ts
import { LRUCache } from 'lru-cache';

const cache = new LRUCache({
  max: 500,
  ttl: 60000, // 1 minute
});

export function rateLimit(identifier: string, limit = 5) {
  const count = (cache.get(identifier) as number) || 0;
  
  if (count >= limit) {
    return false;
  }
  
  cache.set(identifier, count + 1);
  return true;
}

// In login API:
const ip = request.headers.get('x-forwarded-for') || 'unknown';
if (!rateLimit(ip, 5)) {
  return NextResponse.json(
    { error: 'Too many attempts. Try again later.' },
    { status: 429 }
  );
}
```

### 23. Add CSRF Protection
**Recommendation**: Add CSRF tokens for state-changing operations
```typescript
// Generate token on form render
// Validate token on submission
```

### 24. Add Content Security Policy
**Recommendation**: Add CSP headers
```typescript
// next.config.ts
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline';"
  }
];

export default {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  }
};
```

---

## 📋 Summary & Priority Matrix

| Priority | Improvement | Impact | Effort | Status |
|----------|-------------|--------|--------|--------|
| 🔴 High | Fix NODE_ENV warning | High | Low | ⏳ Todo |
| 🔴 High | Add auth context | High | Medium | ⏳ Todo |
| 🔴 High | Add API error handler | High | Low | ⏳ Todo |
| 🟡 Medium | Add form validation | Medium | Low | ⏳ Todo |
| 🟡 Medium | Add session timeout | Medium | Medium | ⏳ Todo |
| 🟡 Medium | Add database indexes | High | Low | ⏳ Todo |
| 🟢 Low | Add PWA support | Medium | Medium | ⏳ Todo |
| 🟢 Low | Add dark mode | Low | Medium | ⏳ Todo |

---

**Next Steps**:
1. Fix critical issues first (ENV, auth context)
2. Add database indexes for performance
3. Implement error handling and validation
4. Add monitoring and logging
5. Consider mobile optimizations
6. Enhance security features

---

**Last Updated**: February 10, 2026
**Platform**: CWMS - Casual Worker Management System
