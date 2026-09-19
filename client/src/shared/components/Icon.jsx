import { Atom, Circle, Cog, Cpu, Droplet, Gauge, Grid3x3, Hexagon, Landmark, Map } from 'lucide-react';
const ICONS = { Atom, Cog, Cpu, Droplet, Gauge, Grid3x3, Hexagon, Landmark, Map };
export default function Icon({ name, ...props }) {
  const Component = ICONS[name] || Circle;
  return <Component {...props} />;
}
