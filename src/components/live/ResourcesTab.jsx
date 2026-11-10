const resources = [
  {
    group: 'Stock video',
    items: [
      { name: 'Pixabay', kind: 'Free', note: 'Free stock video and images. Check the asset page and current Pixabay Content License before use.', url: 'https://pixabay.com/videos/' },
      { name: 'Vecteezy Free Videos', kind: 'Free with attribution', note: 'Commercial use is possible under the Free License, with attribution and limits. Avoid Editorial Use Only files; check each clip licence.', url: 'https://www.vecteezy.com/free-videos/stuck?page=2' },
      { name: 'Shutterstock', kind: 'Paid', note: 'Standard video licence supports social media and YouTube up to 500,000 audience; Enhanced covers unlimited web audiences. Editorial footage is not for commercial use.', url: 'https://www.shutterstock.com/video/search/funny-stuck' },
      { name: 'Envato Elements', kind: 'Paid subscription', note: 'Broad commercial rights, but each download is licensed to one specific project. Do not redistribute raw assets or stock files.', url: 'https://elements.envato.com/stock-video' },
      { name: 'Internet Archive Movies', kind: 'Per-item rights check', note: 'Do not assume a movie is public domain. Use only items with a clear public-domain or commercial-compatible licence, and independently verify uploader claims.', url: 'https://archive.org/details/movies' },
    ],
  },
  {
    group: 'Animation',
    items: [
      { name: 'LottieFiles Free Animations', kind: 'Free commercial use', note: 'Free animations use the Lottie Simple License. Commercial use and edits are allowed, but do not collect/compile its assets to build a competing resource service. Browse and import individual files yourself.', url: 'https://lottiefiles.com/free-animations/stuck' },
    ],
  },
  {
    group: 'Sound effects',
    items: [
      { name: 'Mixkit Sound Effects', kind: 'Free commercial use', note: 'Free SFX can be used in commercial videos, including YouTube. Do not redistribute the sound effect as a standalone stock asset or in a template/library.', url: 'https://mixkit.co/free-sound-effects/' },
    ],
  },
];

export default function ResourcesTab() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-100"><i className="fa-solid fa-folder-open text-indigo-300" /> External Resource Library</div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">Browse trusted stock, animation and sound libraries. Open a site, download an asset under its licence, then import it into your project. Licence terms can differ between individual assets.</p>
      </div>
      {resources.map((section) => (
        <section key={section.group} className="space-y-2">
          <h3 className="text-[11px] uppercase tracking-wider font-bold text-slate-400">{section.group}</h3>
          {section.items.map((item) => (
            <article key={item.name} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-xs font-semibold text-slate-100">{item.name}</h4>
                <span className="shrink-0 rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[9px] font-medium text-slate-300">{item.kind}</span>
              </div>
              <p className="text-[10px] leading-relaxed text-slate-400">{item.note}</p>
              <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-300 hover:text-indigo-200">Browse library <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" /></a>
            </article>
          ))}
        </section>
      ))}
      <p className="text-[10px] leading-relaxed text-amber-300/90">Licence reminder: save the asset page URL, creator name, licence type and download date with every imported file. This library links to sources; it does not grant a licence by itself.</p>
    </div>
  );
}
