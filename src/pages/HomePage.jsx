import { useEffect, useRef, useState } from 'react';
import { createProject, deleteProject, exportProjectFile, importProjectFile, listProjects, saveProject } from '../services/projectStore';
import { createId, cloneValue } from '../utils/id';

const dateLabel = (value) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));

export default function HomePage({ onSelect }) {
  const [projects, setProjects] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const importRef = useRef(null);
  const refresh = async () => { try { setProjects(await listProjects()); setError(''); } catch (e) { setError(`Local storage is unavailable: ${e.message}`); } finally { setBusy(false); } };
  useEffect(() => { refresh(); }, []);

  const startNew = async () => {
    try {
      setError('');
      const project = createProject(`Untitled project ${projects.length + 1}`);
      await saveProject(project);
      await refresh();
      onSelect('live', project);
    } catch (e) {
      setError(`Could not create project: ${e.message || 'local storage is unavailable'}`);
    }
  };
  const openProject = async (project) => onSelect('live', project);
  const removeProject = async (project) => {
    if (!window.confirm(`Delete “${project.name}”? This cannot be undone.`)) return;
    await deleteProject(project.id); refresh();
  };
  const duplicateProject = async (project) => {
    const copy = cloneValue(project); copy.id = createId(); copy.name = `${project.name} copy`; copy.createdAt = Date.now(); copy.updatedAt = Date.now();
    await saveProject(copy); refresh();
  };
  const importFile = async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    try { const project = await importProjectFile(file); await saveProject(project); await refresh(); }
    catch (e) { setError(e.message || 'Could not import this project.'); }
    event.target.value = '';
  };

  return <div className="dashboard min-h-full bg-slate-950 text-white">
    <header className="dashboard-header">
      <div className="brand-lockup"><div className="brand-mark"><i className="fa-solid fa-wand-magic-sparkles" /></div><div><div className="brand-name">Explainer Studio <span>Pro</span></div><div className="brand-subtitle">Your creative workspace</div></div></div>
      <div className="header-actions"><span className="offline-chip"><i className="fa-solid fa-cloud-arrow-down" /> Local projects</span><button className="btn-secondary" onClick={() => importRef.current?.click()}><i className="fa-solid fa-file-import" /> Import</button><input ref={importRef} type="file" accept=".json,.esp.json,application/json" hidden onChange={importFile} /></div>
    </header>
    <main className="dashboard-main">
      <section className="welcome-row"><div><p className="eyebrow">YOUR STUDIO</p><h1>Make something <span>remarkable.</span></h1><p className="welcome-copy">Create, edit and finish your explainer videos in one place.</p></div><button className="btn-primary create-button" onClick={startNew}><i className="fa-solid fa-plus" /> New project</button></section>
      {error && <div className="storage-warning"><i className="fa-solid fa-triangle-exclamation" /> {error}</div>}
      <section className="projects-section"><div className="section-heading"><div><h2>Your projects</h2><p>{projects.length} saved {projects.length === 1 ? 'project' : 'projects'} on this device</p></div><span className="local-label"><i className="fa-solid fa-lock" /> Stored on this device</span></div>
        {busy ? <div className="empty-state">Loading your workspace…</div> : projects.length === 0 ? <div className="empty-state"><div className="empty-icon"><i className="fa-regular fa-folder-open" /></div><h3>Your next great video starts here</h3><p>Create a project and your work will be saved automatically on this device.</p><button className="btn-primary" onClick={startNew}>Create your first project</button></div> : <div className="project-grid">{projects.map((project) => <article className="project-card" key={project.id}>
          <button className="project-open" onClick={() => openProject(project)}><div className="project-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><i className="fa-solid fa-clapperboard"/><span>{project.data?.raw?.length || 0} scenes</span></div><div className="project-info"><h3>{project.name}</h3><p>Edited {dateLabel(project.updatedAt)}</p></div></button>
          <div className="project-actions"><button onClick={() => duplicateProject(project)} title="Duplicate"><i className="fa-regular fa-copy" /></button><button onClick={() => exportProjectFile(project)} title="Export project"><i className="fa-solid fa-file-export" /></button><button onClick={() => removeProject(project)} title="Delete"><i className="fa-regular fa-trash-can" /></button></div>
        </article>)}</div>}
      </section>
      <footer className="dashboard-footer"><span>Explainer Studio Pro</span><span><i className="fa-solid fa-shield-halved" /> Your projects stay on this device unless you export them.</span></footer>
    </main>
  </div>;
}
