import { Routes, Route } from 'react-router-dom'
import PageLayout from './components/layout/PageLayout'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import ContentPage from './pages/ContentPage'
import { CONTENT_PAGES, ROUTES } from './routes'
import './App.css'

function App() {
  return (
    <Routes>
      <Route element={<PageLayout />}>
        <Route path={ROUTES.home} element={<LandingPage />} />
        <Route path={ROUTES.login} element={<LoginPage />} />
        <Route path={ROUTES.signup} element={<SignupPage />} />
        {CONTENT_PAGES.map((page) => (
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
    </Routes>
  )
}

export default App
