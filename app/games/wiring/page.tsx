import WiringGame from '@/components/games/wiring';
import '../games.css';
export const metadata = {
  title: 'Which wiring did the work? · Fly/EM',
  description:
    'Train and compare an anatomical reservoir, a scrambled reservoir and an input-only classifier.',
};
export default function Page() {
  return <WiringGame />;
}
