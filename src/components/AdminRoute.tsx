import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const ADMIN_ROLES = new Set(['ADMIN', 'OWNER'])

export default function AdminRoute() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)

  if (!token || !user) return <Navigate to="/login" replace />

  if (!ADMIN_ROLES.has(user.companyRole)) return <Navigate to="/projects" replace />

  return <Outlet />
}
