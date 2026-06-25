import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import LoginPage from './pages/LoginPage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectPage from './pages/ProjectPage'
import ChatPage from './pages/ChatPage'
import AdminLayout from './pages/admin/AdminLayout'
import ProjectsAdmin from './pages/admin/ProjectsAdmin'
import UsersAdmin from './pages/admin/UsersAdmin'
import TokensAdmin from './pages/admin/TokensAdmin'
import KnowledgeAdmin from './pages/admin/KnowledgeAdmin'
import AiConfigAdmin from './pages/admin/AiConfigAdmin'
import ConfigAdmin from './pages/admin/ConfigAdmin'
import ArchivedAdmin from './pages/admin/ArchivedAdmin'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<ProjectPage />} />
            <Route path="/projects/:id/conversations/:convId" element={<ChatPage />} />
          </Route>
          <Route element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<Navigate to="/admin/projects" replace />} />
              <Route path="/admin/projects" element={<ProjectsAdmin />} />
              <Route path="/admin/users" element={<UsersAdmin />} />
              <Route path="/admin/tokens" element={<TokensAdmin />} />
              <Route path="/admin/knowledge" element={<KnowledgeAdmin />} />
              <Route path="/admin/ai-config" element={<AiConfigAdmin />} />
              <Route path="/admin/config" element={<ConfigAdmin />} />
              <Route path="/admin/archived" element={<ArchivedAdmin />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/projects" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
