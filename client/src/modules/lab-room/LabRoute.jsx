import { Component, lazy, Suspense } from 'react';
import { PixelButton } from '@/shared/components/ui/pixel';

const LabRoomPage = lazy(() => import('./LabRoomPage'));

class LabErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return (
      <div className="grid h-full place-items-center bg-background p-6 text-center">
        <div className="max-w-lg">
          <h1 className="font-pixel text-3xl font-bold">Laboratoriyani yuklab bo'lmadi</h1>
          <p className="my-6 text-muted-foreground">Sahifani yangilab qayta urinib ko'ring yoki fanlar bo'limiga qayting.</p>
          <div className="flex flex-wrap justify-center gap-5">
            <PixelButton onClick={() => window.location.reload()}>Qayta urinish</PixelButton>
            <PixelButton to="/chemistry" variant="secondary">Kimyoga qaytish</PixelButton>
          </div>
        </div>
      </div>
    );
    return this.props.children;
  }
}

export default function LabRoute() {
  return <main className="h-dvh w-full overflow-hidden">
    <LabErrorBoundary>
      <Suspense fallback={<div role="status" className="grid h-full place-items-center bg-background font-pixel text-xl">Laboratoriya yuklanmoqda...</div>}>
        <LabRoomPage />
      </Suspense>
    </LabErrorBoundary>
  </main>;
}
