import { AuthGuard } from '@/components/providers/AuthGuard'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>
}
