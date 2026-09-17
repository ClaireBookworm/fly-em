import NeuronStory from '@/components/story/neuron-story';
import './learn.css';
import '../story.css';
import './experiments.css';
import './visual-essay.css';
export const metadata = {
  title: 'What does it take to emulate a neuron? · Fly/EM',
  description:
    'Start with a real recording, build an interactive neuron model, and compare its predictions with biology.',
};
export default function LearnPage() {
  return <NeuronStory />;
}
