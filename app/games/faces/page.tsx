import FaceGame from '@/components/games/faces';
import '../games.css';
export const metadata = {
  title: 'Change the face, keep the response · Fly/EM',
  description: 'Explore a prototype of axis-based neural face coding.',
};
export default function Page() {
  return <FaceGame />;
}
