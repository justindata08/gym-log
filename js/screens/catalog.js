import { h, appBar, syncTopbarHeight } from '../ui.js';
import { renderCatalog } from '../catalogView.js';

export function renderCatalogScreen(app) {
  const main = h('main', { class: 'content' });
  app.replaceChildren(
    h('header', { class: 'topbar' }, appBar({ title: 'Catalog', back: '#/' })),
    main
  );
  syncTopbarHeight();
  renderCatalog(main, { mode: 'browse' });
}
