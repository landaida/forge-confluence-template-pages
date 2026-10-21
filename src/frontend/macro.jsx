import React, { useEffect, useState } from 'react';
import ForgeReconciler, { DynamicTable, Link, Text } from '@forge/react';
import { invoke } from '@forge/bridge';

const head = {
  cells: [
    { key: 'title', content: 'Page', isSortable: true },
    { key: 'modified', content: 'Last modified', isSortable: true },
  ],
};

const App = () => {
  const [pages, setPages] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    invoke('listTemplatePages').then(setPages).catch((e) => setError(e.message || String(e)));
  }, []);

  if (error) return <Text>Could not load pages: {error}</Text>;

  const rows = (pages || []).map((p) => ({
    key: `row-${p.id}`,
    cells: [
      { key: p.title, content: <Link href={p.url}>{p.title}</Link> },
      { key: p.lastModified, content: new Date(p.lastModified).toLocaleDateString() },
    ],
  }));

  return (
    <DynamicTable
      head={head}
      rows={rows}
      isLoading={pages === null}
      rowsPerPage={10}
      emptyView="No pages created from a template under this page yet."
    />
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
