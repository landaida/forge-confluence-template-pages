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

  return { id: page.id, title: page.title, webui: page._links?.webui };
});

resolver.define('listTemplatePages', async (req) => {
  const pageId = currentPageId(req);
  const cql = `label = "${LABEL}" AND ancestor = ${pageId} ORDER BY lastmodified DESC`;
  const res = await api
    .asUser()
    .requestConfluence(route`/wiki/rest/api/search?cql=${cql}&limit=50`, {
      headers: { Accept: 'application/json' },
    });
  if (!res.ok) throw await failure('Search failed', res);
  const data = await res.json();
  const base = data._links?.base || '';
  return (data.results || []).map((r) => ({
    id: r.content?.id,
    title: r.title,
    url: `${base}${r.url}`,
    lastModified: r.lastModified,
  }));
});

export const handler = resolver.getDefinitions();
