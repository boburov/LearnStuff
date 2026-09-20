// The engine page builds ~200 geometries, so it loads as its own chunk and
// renders full-screen without the site header.
import { Component, lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { PixelButton } from '@/shared/components/ui/pixel';
import NotFoundPage from '@/modules/layout/NotFoundPage';

const PAGES = {
  engine: lazy(() => import('./engine/EnginePage')),
};

class PhysicsErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return (
      <div className="grid h-full place-items-center bg-background p-6 text-center">
        <div className="max-w-lg">
          <h1 className="font-pixel text-3xl font-bold">Mavzuni yuklab bo'lmadi</h1>
          <p className="my-6 text-muted-foreground">Sahifani yangilab qayta urinib ko'ring yoki fizika mavzulariga qayting.</p>
          <div className="flex flex-wrap justify-center gap-5">
            <PixelButton onClick={() => window.location.reload()}>Qayta urinish</PixelButton>
            <PixelButton to="/physics" variant="secondary">Fizikaga qaytish</PixelButton>
          </div>
        </div>
      </div>
    );
    return this.props.children;
  }
}

export default function PhysicsRoute() {
  const { topic } = useParams();
  const Page = PAGES[topic];
  if (!Page) return <NotFoundPage />;
  return <main className="h-dvh w-full overflow-hidden">
    <PhysicsErrorBoundary>
      <Suspense fallback={<div role="status" className="grid h-full place-items-center bg-background font-pixel text-xl">Mavzu yuklanmoqda...</div>}>
        <Page />
      </Suspense>
    </PhysicsErrorBoundary>
  </main>;
}
