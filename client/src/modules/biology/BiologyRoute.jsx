// Biology topics are heavy 3D pages, so each one is split into its own chunk
// and rendered full-screen without the site header.
import { Component, lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { PixelButton } from '@/shared/components/ui/pixel';
import NotFoundPage from '@/modules/layout/NotFoundPage';

const PAGES = {
  cell: lazy(() => import('./cell/CellPage')),
  'cell-studio': lazy(() => import('./cell-studio/CellStudioPage')),
  dna: lazy(() => import('./dna/DnaPage')),
  anatomy: lazy(() => import('./anatomy/AnatomyPage')),
  'human-atlas': lazy(() => import('./human-atlas/HumanAtlasPage')),
  surgery: lazy(() => import('./surgery/SurgeryPage')),
  genetics: lazy(() => import('./genetics/GeneticsPage')),
  simulator: lazy(() => import('./simulator/SimulatorPage')),
};

class BiologyErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return (
      <div className="grid h-full place-items-center bg-background p-6 text-center">
        <div className="max-w-lg">
          <h1 className="font-pixel text-3xl font-bold">Mavzuni yuklab bo'lmadi</h1>
          <p className="my-6 text-muted-foreground">Sahifani yangilab qayta urinib ko'ring yoki biologiya mavzulariga qayting.</p>
          <div className="flex flex-wrap justify-center gap-5">
            <PixelButton onClick={() => window.location.reload()}>Qayta urinish</PixelButton>
            <PixelButton to="/biology" variant="secondary">Biologiyaga qaytish</PixelButton>
          </div>
        </div>
      </div>
    );
    return this.props.children;
  }
}

export default function BiologyRoute() {
  const { topic } = useParams();
  const Page = PAGES[topic];
  if (!Page) return <NotFoundPage />;
  return <main className="h-dvh w-full overflow-hidden">
    <BiologyErrorBoundary>
      <Suspense fallback={<div role="status" className="grid h-full place-items-center bg-background font-pixel text-xl">Mavzu yuklanmoqda...</div>}>
        <Page />
      </Suspense>
    </BiologyErrorBoundary>
  </main>;
}
