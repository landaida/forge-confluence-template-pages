import React, { useEffect, useState } from 'react';
import ForgeReconciler, { DynamicTable, Label, Link, Select, Text, useConfig } from '@forge/react';
import { invoke } from '@forge/bridge';

const MODES = [
  { label: 'Direct children (instant)', value: 'children' },
  { label: 'All descendants (CQL search, index may lag)', value: 'descendants' },
];

const head = {
  cells: [
    { key: 'title', content: 'Page', isSortable: true },
    { key: 'modified', content: 'Last modified', isSortable: true },
  ],
};

// Macro configuration panel: the field names become keys of the config object
// that useConfig() returns inside the macro.
const Config = () => (
  <>
    <Label labelFor="mode">Which pages to list</Label>
    <Select name="mode" id="mode" options={MODES} defaultValue={MODES[0]} />
  </>
);

const App = () => {
  const config = useConfig();
  const mode = config?.mode?.value || config?.mode || 'children';
  const [pages, setPages] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setPages(null);
    invoke('listTemplatePages', { mode })
      .then((r) => setPages(r.rows))
      .catch((e) => setError(e.message || String(e)));
  }, [mode]);

  if (error) return <Text>Could not load pages: {error}</Text>;

  const rows = (pages || []).map((p) => ({
    key: `row-${p.id}`,
    cells: [
      { key: p.title, content: <Link href={p.url}>{p.title}</Link> },
      { key: p.lastModified, content: new Date(p.lastModified).toLocaleDateString() },
    ],
  }));

  return (
    <>
      <DynamicTable
        head={head}
        rows={rows}
        isLoading={pages === null}
        rowsPerPage={10}
        emptyView="No pages created from a template under this page yet."
      />
      <Text>{mode === 'descendants' ? 'Source: CQL search over all descendants.' : 'Source: direct children.'}</Text>
    </>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
ForgeReconciler.addConfig(<Config />);
