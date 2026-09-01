# Архитектура

## Решение

HISTORIA 3D — статическое React/Vite-приложение без backend. React хранит только UI-state; Three.js controller владеет renderer, scene, camera, controls и ресурсами. Это минимальнее глобального state framework и достаточно, пока нет совместного редактирования или server state.

```text
src/app/MuseumApp
  ├─ content/catalog → collection → Exhibit
  ├─ ExhibitInfo / ResearchFlow / ProvenanceDrawer
  ├─ ExhibitCarousel
  └─ ExhibitViewer
       ├─ model-runtime (GLB | procedural)
       ├─ ViewerController
       └─ projected hotspots
```

## Файловая структура

```text
src/
  app/                 composition and app state
  components/          small shared UI primitives
  content/             types, registry, collections, exhibit packages
  features/            viewer, info, carousel, hotspots, narration, provenance
  state/               latest-request-wins coordinator
  three/               factories, loader, disposal, camera conventions
  styles/              tokens, global and responsive layouts
  utils/               pure utilities
scripts/               content and production-boundary validation
tests/ e2e/            unit/integration and browser flows
```

## Viewer contract

`ExhibitModel` is a discriminated union. A GLB descriptor gives `src`; a procedural descriptor gives stable `factoryId`. Both resolve to `LoadedExhibitModel { root, dispose }`. Coordinates are right-handed Three.js: +Y up, +Z toward the initial camera, model origin at ground-centre. Hotspot `position`, `cameraTarget` and optional `cameraPosition` use model-local metres.

Every load receives an `AbortSignal` and monotonic token. Only the newest token may commit. Stale roots are disposed. Unmount stops the animation loop, disconnects ResizeObserver, removes context handlers, disposes controls, scene resources and renderer, then forces context loss.

## Publication boundary

Review build may include `developmentOnly` models. Production validation accepts only `published` exhibits, complete sources, review records, credits and non-development assets. Original references belong in ignored `assets/source-references`; candidate work belongs in ignored `assets/candidates`; runtime content lives only in an approved package.

## Risks and mitigations

- Historical overclaim: typed evidence and claim-level sources; unknowns remain explicit.
- Temporary model mistaken for history: persistent DEV badge and blocked production build.
- GPU leaks: single controller owner, abort/dispose protocol and repeated-switch E2E.
- Mobile clipping: independent portrait composition and safe-area fit.
- Adding a new object rewrites UI: catalog and package contracts keep object knowledge out of app components.
- GLB variability: normalization contract, coordinate convention, size/triangle budgets and loader errors with poster fallback.

