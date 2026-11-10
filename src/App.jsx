import { useState } from 'react';
import HomePage from './pages/HomePage';
import LiveExplainerPage from './pages/LiveExplainerPage';
import AnimationExplainerPage from './pages/AnimationExplainerPage';

export default function App() {
  const [view, setView] = useState('home');
  const [project, setProject] = useState(null);
  const select = (nextView, nextProject) => { setView(nextView); if (nextProject) setProject(nextProject); };
  const back = () => setView('home');

  if (view === 'live') return <LiveExplainerPage key={project?.id} project={project} onBack={back} onProjectChange={setProject} />;
  if (view === 'animation') return <AnimationExplainerPage onBack={back} />;
  return <HomePage onSelect={select} />;
}
