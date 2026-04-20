import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const Home = lazy(() => import('./pages/Home'));
const Empowerment = lazy(() => import('./pages/Empowerment'));
const InteractiveGames = lazy(() => import('./pages/InteractiveGames'));
const TeachingZone = lazy(() => import('./pages/TeachingZone'));
const Recommend = lazy(() => import('./pages/Recommend'));
const HtmlViewer = lazy(() => import('./pages/HtmlViewer'));

const RandomPicker = lazy(() => import('./pages/tools/RandomPicker'));
const ClassroomTimer = lazy(() => import('./pages/tools/ClassroomTimer'));
const GroupScoreboard = lazy(() => import('./pages/tools/GroupScoreboard'));

const AdminUpload = lazy(() => import('./pages/admin/AdminUpload'));
const TestConnection = lazy(() => import('./pages/TestConnection'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-10 h-10 rounded-full border-4 border-emerald-200 border-t-emerald-500 animate-spin" />
  </div>
);

function LegacyLabRedirect() {
  const { slug } = useParams();
  return <Navigate to={slug ? `/${slug}` : '/'} replace />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="games" element={<InteractiveGames />} />
                <Route path="empower" element={<Empowerment />} />
                <Route path="teaching-zone" element={<TeachingZone />} />
                <Route path="recommend" element={<Recommend />} />
              </Route>
              <Route path="/tools/random-picker" element={<RandomPicker />} />
              <Route path="/tools/timer" element={<ClassroomTimer />} />
              <Route path="/tools/scoreboard" element={<GroupScoreboard />} />
              <Route path="/lab/:slug" element={<LegacyLabRedirect />} />
              <Route path="/zhijing/:slug" element={<HtmlViewer />} />
              <Route path="/view" element={<HtmlViewer />} />
              <Route path="/admin/upload" element={<AdminUpload />} />
              <Route path="/test-connection" element={<TestConnection />} />
              <Route path="/:slug" element={<HtmlViewer />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
