import EmbodiedExplorer from '@/components/embodied-explorer';
import './embodied.css';
export const metadata = {
  title: 'From vision to movement · Fly/EM',
  description:
    'Inspect visual model activity, flight motor recordings, and the assumptions between a neuron and a moving wing.',
};
export default function EmbodiedPage() {
  return <EmbodiedExplorer />;
}
