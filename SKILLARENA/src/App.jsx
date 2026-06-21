import { Routes, Route, Navigate } from 'react-router-dom'
import ScrollToTop from './components/ScrollToTop'
import PageLayout from './components/layout/PageLayout'
import AuthLayout from './components/layout/AuthLayout'
import AppLayout from './components/layout/AppLayout'
import AdminLayout from './components/layout/AdminLayout'
import ProtectedRoute from './components/ProtectedRoute'
import ProtectedAdminRoute from './components/ProtectedAdminRoute'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import DashboardPage from './pages/DashboardPage'
import LearnAppPage from './pages/LearnAppPage'
import CourseDetailPage from './pages/CourseDetailPage'
import LessonPage from './pages/LessonPage'
import PracticePage from './pages/PracticePage'
import BattlesAppPage from './pages/BattlesAppPage'
import LeaderboardAppPage from './pages/LeaderboardAppPage'
import ProfilePage from './pages/ProfilePage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminCoursesPage from './pages/admin/AdminCoursesPage'
import AdminPracticePage from './pages/admin/AdminPracticePage'
import AdminBlogPage from './pages/admin/AdminBlogPage'
import AdminResumesPage from './pages/admin/AdminResumesPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import ResumeMakerPage from './pages/ResumeMakerPage'
import BlogPage from './pages/BlogPage'
import BlogPostPage from './pages/BlogPostPage'
import ContentPage from './pages/ContentPage'
import { CONTENT_PAGES, ROUTES } from './routes'
import './App.css'

const MARKETING_PAGES = CONTENT_PAGES.filter(
  (page) => !['battles', 'courses', 'leaderboard', 'blog'].includes(page.contentKey),
)

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
      <Route element={<AuthLayout />}>
        <Route path={ROUTES.login} element={<LoginPage />} />
        <Route path={ROUTES.signup} element={<SignupPage />} />
        <Route path={ROUTES.forgotPassword} element={<ForgotPasswordPage />} />
        <Route path={ROUTES.adminLogin} element={<Navigate to={ROUTES.login} replace />} />
      </Route>

      <Route element={<PageLayout />}>
        <Route path={ROUTES.home} element={<LandingPage />} />
        <Route path={ROUTES.blog} element={<BlogPage />} />
        <Route path={`${ROUTES.blog}/:slug`} element={<BlogPostPage />} />
        {MARKETING_PAGES.map((page) => (
          <Route
            key={page.path}
            path={page.path}
            element={
              <ContentPage
                contentKey={page.contentKey}
                eyebrow={page.eyebrow}
                title={page.title}
                description={page.description}
              />
            }
          />
        ))}
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path={ROUTES.dashboard} element={<DashboardPage />} />
        <Route path={ROUTES.learn} element={<LearnAppPage />} />
        <Route path={`${ROUTES.learn}/:courseId`} element={<CourseDetailPage />} />
        <Route path={`${ROUTES.learn}/:courseId/lessons/:lessonId`} element={<LessonPage />} />
        <Route path={ROUTES.practice} element={<PracticePage />} />
        <Route path={ROUTES.battles} element={<BattlesAppPage />} />
        <Route path={ROUTES.leaderboard} element={<LeaderboardAppPage />} />
        <Route path={ROUTES.profile} element={<ProfilePage />} />
        <Route path={ROUTES.resume} element={<ResumeMakerPage />} />
      </Route>

      <Route
        element={
          <ProtectedAdminRoute>
            <AdminLayout />
          </ProtectedAdminRoute>
        }
      >
        <Route path={ROUTES.admin} element={<AdminDashboardPage />} />
        <Route path={ROUTES.adminCourses} element={<AdminCoursesPage />} />
        <Route path={ROUTES.adminPractice} element={<AdminPracticePage />} />
        <Route path={ROUTES.adminBlog} element={<AdminBlogPage />} />
        <Route path={ROUTES.adminResume} element={<ResumeMakerPage adminMode />} />
        <Route path={ROUTES.adminResumes} element={<AdminResumesPage />} />
        <Route path={ROUTES.adminUsers} element={<AdminUsersPage />} />
      </Route>
    </Routes>
    </>
  )
}

export default App
