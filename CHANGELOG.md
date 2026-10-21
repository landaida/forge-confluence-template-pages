# Changelog

## 0.1.1

- Direct-children mode now uses only v2 endpoints (children, labels, bulk pages); the v1 `child/page` endpoint returned `401 scope does not match` under granular scopes.
- Macro resolvers read as the app (`asApp()`): a macro is rendered for every reader, and `asUser()` forced each of them through the consent prompt (and looped after a scope change). The content action still runs `asUser()` so pages carry the real author.
- Index macro now has a configuration (`config: true` + `useConfig`) with two modes: direct children read from the content store (instant) or all descendants through a CQL search (deeper, but the search index can lag minutes behind page creation).
- Fix: after creating the page the modal tried `view.close()`, which content actions do not allow; it now navigates to the new page (`router.navigate`) and shows a link as fallback.
- Fix: the content action modal rendered empty because `TextField` does not exist in `@forge/react` (the component is `Textfield`).

## 0.1.0

- Registered, linted, deployed to `development` and installed on a Confluence Cloud dev site (Forge CLI 14.2.0, runtime nodejs22.x).

- Content action "Create page from template" (UI Kit 2 modal).
- Three bundled templates: Meeting notes, Decision record, Runbook.
- Macro "Template pages index" listing pages created by the app (label `template-page`).
- Resolvers: `listTemplates`, `createPage`, `listTemplatePages`.
