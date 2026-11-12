import { useState, useEffect } from 'react';

const TABS = [
  ['script', 'fa-align-left', 'Script'],
  ['scenes', 'fa-film', 'Scenes'],
  ['pixabay', 'fa-magnifying-glass', 'Search & Swap'],
  ['resources', 'fa-folder-open', 'Resources'],
  ['audio', 'fa-microphone-lines', 'Audio'],
  ['captions', 'fa-closed-captioning', 'Captions'],
  ['ai-director', 'fa-robot', 'AI Director'],
];

export default function Sidebar({ tab, onTab, children }) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 769);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleTabClick = (id) => {
    onTab(tab === id ? null : id);
  };

  return (
    <aside className={`studio-sidebar ${isMobile ? 'is-mobile' : 'is-desktop'} ${!tab ? 'is-collapsed' : 'has-content'}`}>
      <div className="studio-tab-content">
        {children}
      </div>
      <nav className="studio-tabbar" aria-label="Studio tools">
        {TABS.map(([id, icon, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => handleTabClick(id)}
            aria-label={label}
            aria-current={tab === id ? 'page' : undefined}
            className={tab === id ? 'active' : ''}
          >
            <i className={`fa-solid ${icon}`} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
