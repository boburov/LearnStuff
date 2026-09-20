import { Component, Suspense } from 'react';
import { PixelButton } from '@/shared/components/ui/pixel';
import { getSubject } from '@/modules/subjects/subjects';
import NotFoundPage from '@/modules/layout/NotFoundPage';
import { TOPIC_PAGES } from './topicPages';

class TopicErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    const { subject, children } = this.props;
    if (!this.state.failed) return children;
    return (
      <div className="grid h-full place-items-center bg-background p-6 text-center">
        <div className="max-w-lg">
          <h1 className="font-pixel text-3xl font-bold">Mavzuni yuklab bo'lmadi</h1>
          <p className="my-6 text-muted-foreground">Sahifani yangilab qayta urinib ko'ring yoki mavzular ro'yxatiga qayting.</p>
          <div className="flex flex-wrap justify-center gap-5">
            <PixelButton onClick={() => window.location.reload()}>Qayta urinish</PixelButton>
            <PixelButton to={`/${subject.slug}`} variant="secondary">{subject.title}ga qaytish</PixelButton>
          </div>
        </div>
      </div>
    );
  }
}

// One full-screen shell for every live topic: no site header, its own chunk,
// and a way back to the subject when the 3D page fails to start.
export default function TopicRoute({ topicKey }) {
  const Page = TOPIC_PAGES[topicKey];
  const subject = getSubject(topicKey.split('/')[0]);
  if (!Page || !subject) return <NotFoundPage />;
  return <main className="h-dvh w-full overflow-hidden">
    <TopicErrorBoundary subject={subject}>
      <Suspense fallback={<div role="status" className="grid h-full place-items-center bg-background font-pixel text-xl">Mavzu yuklanmoqda...</div>}>
        <Page />
      </Suspense>
    </TopicErrorBoundary>
  </main>;
}
