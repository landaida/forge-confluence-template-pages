import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';

import templates from './templates';

const LABEL = 'template-page';
const resolver = new Resolver();

/** Read a JSON error body without throwing, for useful messages. */
async function failure(prefix, response) {
  let detail = '';
  try {
    detail = (await response.text()).slice(0, 300);
  } catch (e) {
    // ignore
  }
  return new Error(`${prefix} (HTTP ${response.status}) ${detail}`.trim());
}

function currentPageId(req) {
  const id = req.context?.extension?.content?.id;
  if (!id || !/^\d+$/.test(String(id))) {
    throw new Error('This action must be used on a Confluence page.');
  }
  return String(id);
}

resolver.define('listTemplates', () =>
  templates.all.map(({ key, name, fields }) => ({ key, name, fields }))
);

resolver.define('createPage', async (req) => {
  const { templateKey, values = {} } = req.payload || {};
  const template = templates.get(templateKey);
  if (!template) {
    throw new Error(`Unknown template: ${templateKey}`);
  }

  const clean = {};
  for (const field of template.fields) {
    const raw = String(values[field.name] ?? '').trim();
    if (field.required && !raw) {
      throw new Error(`${field.label} is required.`);
    }
    if (raw.length > 255) {
      throw new Error(`${field.label} is too long (max 255 characters).`);
    }
    clean[field.name] = raw;
  }

  const parentId = currentPageId(req);

  // The v2 create endpoint needs the space id, so read it from the parent.
  const parentRes = await api
    .asUser()
    .requestConfluence(route`/wiki/api/v2/pages/${parentId}`, {
      headers: { Accept: 'application/json' },
    });
  if (!parentRes.ok) throw await failure('Could not read the current page', parentRes);
  const parent = await parentRes.json();

  const createRes = await api.asUser().requestConfluence(route`/wiki/api/v2/pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      spaceId: parent.spaceId,
      status: 'current',
      title: clean.title,
      parentId,
      body: { representation: 'storage', value: template.render(clean) },
    }),
  });
  if (!createRes.ok) throw await failure('Could not create the page', createRes);
  const page = await createRes.json();

  // Label the page so the index macro can find it. The v2 API has no
  // "add label" endpoint yet, so this one call uses the v1 content API.
  const labelRes = await api
    .asUser()
    .requestConfluence(route`/wiki/rest/api/content/${page.id}/label`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify([{ prefix: 'global', name: LABEL }]),
    });
  if (!labelRes.ok) throw await failure('Page created but labelling failed', labelRes);

  // v2 returns webui relative to the site's /wiki base; build an absolute URL
  // so the frontend can both link to it and router.navigate() to it.
  const base = page._links?.base || '';
  return { id: page.id, title: page.title, url: `${base}${page._links?.webui || ''}` };
});

// Two ways to find the pages the app created, selectable from the macro config:
//  - "children": direct children read from the content store (instant, one call).
//  - "descendants": every page below this one through a CQL search; it goes
//    deeper, but the search index can lag a few minutes behind page creation.
const toRow = (base) => (p) => ({
  id: p.id,
  title: p.title,
  url: `${base}${p._links?.webui || ''}`,
  lastModified: p.version?.createdAt || p.version?.when, // v2 uses createdAt, v1 when
});

// The macro reads as the app (asApp), not as the viewer: a macro is rendered
// for every reader of the page, and asUser() would make each of them grant
// consent first. The content action keeps asUser() so the created page has the
// real author. Trade-off: asApp ignores page restrictions, so only use it for
// listings where that is acceptable.
async function getJson(path) {
  const res = await api.asApp().requestConfluence(path, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw await failure(`Request failed: ${res.url || ''}`, res);
  return res.json();
}

// v2 only (granular scopes read:page / read:label): children give ids, labels
// come per page, and one bulk /pages?id=... call adds link and version.
async function listDirectChildren(pageId) {
  const children = (await getJson(route`/wiki/api/v2/pages/${pageId}/children?limit=100`)).results || [];
  if (!children.length) return [];
  const labelled = await Promise.all(
    children.map(async (c) => {
      const labels = (await getJson(route`/wiki/api/v2/pages/${c.id}/labels`)).results || [];
      return labels.some((l) => l.name === LABEL) ? c.id : null;
    }),
  );
  const ids = labelled.filter(Boolean);
  if (!ids.length) return [];
  const data = await getJson(route`/wiki/api/v2/pages?id=${ids.join(',')}&limit=100`);
  return (data.results || []).map(toRow(data._links?.base || ''));
}

async function searchDescendants(pageId) {
  const cql = `label = "${LABEL}" AND ancestor = ${pageId} ORDER BY lastmodified DESC`;
  const data = await getJson(route`/wiki/rest/api/search?cql=${cql}&limit=100`);
  const base = data._links?.base || '';
  return (data.results || []).map((r) => ({
    id: r.content?.id,
    title: r.title,
    url: `${base}${r.url}`,
    lastModified: r.lastModified,
  }));
}

resolver.define('listTemplatePages', async (req) => {
  const pageId = currentPageId(req);
  const mode = req.payload?.mode === 'descendants' ? 'descendants' : 'children';
  const rows = mode === 'descendants' ? await searchDescendants(pageId) : await listDirectChildren(pageId);
  rows.sort((a, b) => String(b.lastModified).localeCompare(String(a.lastModified)));
  return { mode, rows };
});

export const handler = resolver.getDefinitions();
