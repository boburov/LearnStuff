import { lazy } from 'react';

// Every live topic, keyed "subject/topic" exactly as the URL reads it. The pages
// are heavy 3D modules, so each one loads as its own chunk.
export const TOPIC_PAGES = {
  'chemistry/lab': lazy(() => import('@/modules/lab-room/LabRoomPage')),
  // Old links and review scripts still point at lab-3d.
  'chemistry/lab-3d': lazy(() => import('@/modules/lab-room/LabRoomPage')),
  'chemistry/atoms': lazy(() => import('@/modules/chemistry/atoms/AtomsPage')),
  'chemistry/ph': lazy(() => import('@/modules/chemistry/ph/PhPage')),
  'chemistry/gas-laws': lazy(() => import('@/modules/chemistry/gas-laws/GasLawsPage')),
  'chemistry/molecules': lazy(() => import('@/modules/chemistry/molecules/MoleculesPage')),
  // The single-bench lab, for phones and computers that cannot run the room.
  'chemistry/lab-classic': lazy(() => import('@/modules/chemistry/lab-classic/LabBenchPage')),
  'chemistry/periodic-table': lazy(() => import('@/modules/chemistry/periodic/PeriodicTablePage')),
  'electronics/arduino': lazy(() => import('@/modules/electronics/circuit/CircuitPage')),
  'history/registan': lazy(() => import('@/modules/history/registan/RegistanGuidePage')),
  'biology/cell': lazy(() => import('@/modules/biology/cell/CellPage')),
  'biology/cell-studio': lazy(() => import('@/modules/biology/cell-studio/CellStudioPage')),
  'biology/dna': lazy(() => import('@/modules/biology/dna/DnaPage')),
  'biology/anatomy': lazy(() => import('@/modules/biology/anatomy/AnatomyPage')),
  'biology/human-atlas': lazy(() => import('@/modules/biology/human-atlas/HumanAtlasPage')),
  'biology/surgery': lazy(() => import('@/modules/biology/surgery/SurgeryPage')),
  'biology/genetics': lazy(() => import('@/modules/biology/genetics/GeneticsPage')),
  'biology/simulator': lazy(() => import('@/modules/biology/simulator/SimulatorPage')),
  'physics/engine': lazy(() => import('@/modules/physics/engine/EnginePage')),
};

export const TOPIC_KEYS = Object.keys(TOPIC_PAGES);
