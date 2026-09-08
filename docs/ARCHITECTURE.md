# Архитектура

## Решение

HISTORIA 3D — статическое React/Vite-приложение без backend. `MuseumApp` компонует интерфейс, `useMuseumController` управляет UI-state через reducer. `ViewerController` связывает отдельные подсистемы Three.js и владеет canvas/renderer/scene.

```text
src/app/MuseumApp
  ├─ state/useMuseumController → museum-state / exhibit-url
  ├─ content/catalog → collection → Exhibit
  ├─ ExhibitInfo / ResearchFlow / ProvenanceDrawer
  ├─ ExhibitCarousel
  └─ ExhibitViewer
       └─ ViewerController
            ├─ CameraRig (OrbitControls, transitions, reduced motion)
            ├─ LightingRig (environment, contact shadow, scale figure)
            ├─ ModelHost → model-runtime (GLB | procedural)
            ├─ HotspotSystem (surface anchors, projection, occlusion)
            └─ RenderScheduler (requestAnimationFrame only when needed)
```

## Файловая структура

```text
src/
  app/                 composition
  components/          small shared UI primitives
  content/             types, registry, collections, exhibit packages
  features/            viewer, info, carousel, hotspots, narration, provenance
  state/               UI reducer/controller, URL helpers, latest-request coordinator
  three/               factories, loader, disposal, camera conventions
  styles/              tokens, global and responsive layouts
  utils/               pure utilities
scripts/               content and production-boundary validation
tests/ e2e/            unit/integration and browser flows
```

## Viewer contract

`ExhibitModel` is a discriminated union. A GLB descriptor gives `src`; a procedural descriptor gives stable `factoryId`. Both resolve to `LoadedExhibitModel { root, dispose }`. Coordinates are right-handed Three.js: +Y up, +Z toward the initial camera, model origin at ground-centre. Hotspot `position`, `cameraTarget` and optional `cameraPosition` use model-local metres.

Every load receives an `AbortSignal` and monotonic token. GLB fetch is cancellable; parsing that finishes after replacement disposes its result. Only the newest token may commit; stale errors never replace the current scene with an error. ModelHost owns roots, LightingRig owns light/shadow/environment resources, CameraRig owns controls and its media-query listener. Unmount cancels scheduled frames, disconnects ResizeObserver, removes handlers and disposes all subsystems and the renderer.

`RenderScheduler.invalidate()` coalesces work into one frame. Camera movement/damping requests subsequent frames; a settled scene has no pending RAF. Resize, model readiness, controls and comparison invalidate the frame. Context loss pauses scheduling and reports the existing viewer error. The scheduler accepts an injected frame clock for isolated tests.

`museumReducer` atomically resets the selected hotspot, drawers, comparison and announcement on exhibit changes. `useMuseumController` owns callbacks and toast cleanup. The exhibit URL is normalized with `replaceState` at entry, changed with `pushState` on selection, and read on `popstate`. Unknown ids fall back to the first collection default. Path, unrelated query parameters and hash survive. Collection selection uses the same action. Future state/actions can be added to the reducer and URL helpers; Assembly behavior is not present.

## Publication boundary

Review build may include `developmentOnly` models. Production validation accepts only `published` exhibits, complete sources, review records, credits and non-development assets. Original references belong in ignored `assets/source-references`; candidate work belongs in ignored `assets/candidates`; runtime content lives only in an approved package.

## Risks and mitigations

- Historical overclaim: typed evidence and claim-level sources; unknowns remain explicit.
- Temporary model mistaken for history: persistent DEV badge and blocked production build.
- GPU leaks: single controller owner, abort/dispose protocol and repeated-switch E2E.
- Mobile clipping: independent portrait composition and safe-area fit.
- Adding a new object rewrites UI: catalog and package contracts keep object knowledge out of app components.
- GLB variability: normalization contract, coordinate convention, size/triangle budgets and explicit loader errors. Loading uses the existing indicator.
