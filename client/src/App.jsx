import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, Outlet, useLocation } from 'react-router-dom';
import SiteHeader from './modules/layout/SiteHeader';
import SiteFooter from './modules/layout/SiteFooter';
import NotFoundPage from './modules/layout/NotFoundPage';
import HomePage from './modules/home/HomePage';
import WorldMapSection from './modules/subjects/WorldMapSection';
import SubjectPage from './modules/subjects/SubjectPage';
import TopicPreviewPage from './modules/subjects/TopicPreviewPage';
import TopicRoute from './modules/topics/TopicRoute';
import { TOPIC_KEYS } from './modules/topics/topicPages';

function PageScroll() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);
  return null;
}

function SiteLayout() {
  return <>
    <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-card focus:p-4">Asosiy kontentga o'tish</a>
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />
      <main id="main" className="flex-1"><Outlet /></main>
      <SiteFooter />
    </div>
  </>;
}

export default function App() {
  return <BrowserRouter>
    <PageScroll />
    <Routes>
      {TOPIC_KEYS.map((key) => (
        <Route key={key} path={`/${key}`} element={<TopicRoute topicKey={key} />} />
      ))}
      <Route element={<SiteLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/subjects" element={<><h1 className="sr-only">Fanlar</h1><WorldMapSection /></>} />
        <Route path="/:subject" element={<SubjectPage />} />
        <Route path="/:subject/:topic" element={<TopicPreviewPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  </BrowserRouter>;
}
