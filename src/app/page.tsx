import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default async function HomePage() {
  // Check if user is authenticated
  const user = await getCurrentUser();

  if (user) {
    // Redirect authenticated users to their role-specific dashboard
    console.log('[Root] User authenticated, redirecting to dashboard for role:', user.role);
    const dashboardUrl = user.role === 'supervisor'
      ? '/supervisor/dashboard'
      : user.role === 'admin'
        ? '/admin/dashboard'
        : '/exporter/dashboard';

    redirect(dashboardUrl);
  } else {
    // Redirect unauthenticated users to login
    console.log('[Root] No authenticated user, redirecting to login');
    redirect('/login');
  }
}
