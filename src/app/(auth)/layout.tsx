import { ReactNode } from 'react';

export const metadata = {
    title: 'Login - Akazi',
    description: 'Login to Akazi',
};

export default function AuthLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
}
