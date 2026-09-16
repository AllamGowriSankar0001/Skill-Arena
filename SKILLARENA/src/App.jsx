import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ScrollToTop from './components/ScrollToTop'
import CursorTrail from './components/CursorTrail'
import PageLayout from './components/layout/PageLayout'
import AuthLayout from './components/layout/AuthLayout'
import AppLayout from './components/layout/AppLayout'
import AdminLayout from './components/layout/AdminLayout'
import ProtectedRoute from './components/ProtectedRoute'
import ProtectedAdminRoute from './components/ProtectedAdminRoute'
import PageLoadingSkeleton from './components/PageLoadingSkeleton'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import BlogPage from './pages/BlogPage'
import SocialComingSoonPage from './pages/SocialComingSoonPage'
import { CONTENT_PAGES, ROUTES } from './routes'
import './App.css'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const LearnAppPage = lazy(() => import('./pages/LearnAppPage'))
const CourseDetailPage = lazy(() => import('./pages/CourseDetailPage'))
const LessonPage = lazy(() => import('./pages/LessonPage'))
const PracticePage = lazy(() => import('./pages/PracticePage'))
const PracticeDetailPage = lazy(() => import('./pages/PracticeDetailPage'))
const BattlesAppPage = lazy(() => import('./pages/BattlesAppPage'))
const BattleRoomPage = lazy(() => import('./pages/BattleRoomPage'))
const LeaderboardAppPage = lazy(() => import('./pages/LeaderboardAppPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const ResumeMakerPage = lazy(() => import('./pages/ResumeMakerPage'))
const BlogPostPage = lazy(() => import('./pages/BlogPostPage'))
const CommunityPage = lazy(() => import('./pages/CommunityPage'))
const ContentPage = lazy(() => import('./pages/ContentPage'))
const DevelopersPage = lazy(() => import('./pages/DevelopersPage'))
const SkeletonPreviewPage = lazy(() => import('./pages/SkeletonPreviewPage'))
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'))
const AdminCoursesPage = lazy(() => import('./pages/admin/AdminCoursesPage'))
const AdminPracticePage = lazy(() => import('./pages/admin/AdminPracticePage'))
const AdminBlogPage = lazy(() => import('./pages/admin/AdminBlogPage'))
const AdminResumesPage = lazy(() => import('./pages/admin/AdminResumesPage'))
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'))

const MARKETING_PAGES = CONTENT_PAGES.filter(
  (page) =>
    !['battles', 'courses', 'leaderboard', 'blog', 'community', 'developers'].includes(
      page.contentKey,
    ),
)

const RouteFallback = () => (
  <div className="app-loading-bone" role="status" aria-live="polite">
    <PageLoadingSkeleton label="Loading page" />
  </div>
)

function App() {
  return (
    <>
      <ScrollToTop />
      <CursorTrail />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path={ROUTES.login} element={<LoginPage />} />
            <Route path={ROUTES.signup} element={<SignupPage />} />
            <Route path={ROUTES.forgotPassword} element={<ForgotPasswordPage />} />
            <Route path={ROUTES.resetPassword} element={<ResetPasswordPage />} />
            <Route path={ROUTES.adminLogin} element={<Navigate to={ROUTES.login} replace />} />
          </Route>

          <Route element={<PageLayout />}>
            <Route path={ROUTES.home} element={<LandingPage />} />
            <Route path={ROUTES.blog} element={<BlogPage />} />
            <Route path={`${ROUTES.blog}/:slug`} element={<BlogPostPage />} />
            <Route path={ROUTES.socialComingSoon} element={<SocialComingSoonPage />} />
            <Route path="/skeleton-preview" element={<SkeletonPreviewPage />} />
            <Route path={ROUTES.developers} element={<DevelopersPage />} />
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
            <Route path={`${ROUTES.practice}/:assessmentId`} element={<PracticeDetailPage />} />
            <Route path={ROUTES.battles} element={<BattlesAppPage />} />
            <Route path={`${ROUTES.battles}/:battleId`} element={<BattleRoomPage />} />
            <Route path={ROUTES.leaderboard} element={<LeaderboardAppPage />} />
            <Route path={ROUTES.community} element={<CommunityPage />} />
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
            <Route path={ROUTES.adminCommunity} element={<CommunityPage adminLayout />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  )
}

export default App
