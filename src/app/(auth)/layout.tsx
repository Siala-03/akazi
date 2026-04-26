import { ReactNode } from 'react';

export const metadata = {
    title: 'Login - Akazi Rwanda Ltd',
    description: 'Login to Akazi Rwanda Ltd',
};

export default function AuthLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
}
