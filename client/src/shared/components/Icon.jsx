import { Atom, Circle, Cog, Cpu, Dna, Droplet, FlaskConical, Gauge, GitFork, Grid3x3, Hexagon, Landmark, Map, Microscope, PersonStanding, ScanSearch, Scissors } from 'lucide-react';
const ICONS = { Atom, Cog, Cpu, Dna, Droplet, FlaskConical, Gauge, GitFork, Grid3x3, Hexagon, Landmark, Map, Microscope, PersonStanding, ScanSearch, Scissors };
export default function Icon({ name, ...props }) {
  const Component = ICONS[name] || Circle;
  return <Component {...props} />;
}
