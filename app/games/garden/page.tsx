import Garden from '@/components/games/garden';
import '../games.css';
export const metadata = {
  title: 'Circuit garden · Fly/EM',
  description: 'Build, stimulate and inspect a small model neural circuit.',
};
export default function Page() {
  return <Garden />;
}
