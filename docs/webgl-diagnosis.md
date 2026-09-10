# WebGL diagnosis: Pokrov-na-Nerli viewer

> **Архив диагностики · 1 сентября 2026.** Описывает исправление конкретной ошибки жизненного цикла. Упоминание poster как fallback ниже историческое: текущий viewer показывает индикатор загрузки и текстовую ошибку без подмены 3D постером. [Актуальная архитектура](ARCHITECTURE.md) · [Запуск и диагностика](GETTING_STARTED.md).

Date: 2026-09-01

## What was happening

- React always created `<canvas class="viewer-canvas">`.
- `ExhibitViewer` instantiated `ViewerController`, and its constructor created `THREE.WebGLRenderer` on the React-owned canvas.
- The real failure was lifecycle-related, not missing GPU support. Development runs under `React.StrictMode`, which intentionally starts an effect, runs its cleanup, and starts it again on the same DOM canvas.
- The first cleanup called `renderer.forceContextLoss()`. The second mount reused that forcibly lost canvas context, and Three.js failed in `WebGLCapabilities` while reading shader precision: `Cannot read properties of null (reading 'precision')`.
- Direct Chrome diagnostics proved that WebGL2, vertex precision and fragment precision were available on the NVIDIA RTX 3070. No Chrome policy disabled WebGL.
- The catch block then showed the poster and also invented three fixed screen-space hotspot coordinates. That made the fallback look like the exhibit itself and obscured the lifecycle bug.
- The generated landscape is already a separate DEV_ONLY environment without a church. The church visible in fallback was the transparent poster, not part of the background.

## Fix

- Renderer creation now explicitly requests one WebGL2 context and passes that context to `WebGLRenderer`.
- Normal disposal calls `renderer.dispose()` but no longer calls `forceContextLoss()`. This keeps StrictMode remount safe while still releasing renderer-owned resources and stopping the animation loop.
- A successful renderer marks the canvas with `data-renderer="webgl"`; fallback marks it `data-renderer="unavailable"`.
- Error fallback no longer creates fake screen-space hotspots. Poster remains loading/error-only.
- The normal runtime loads a real procedural `THREE.Group` from the exhibit package. Hotspots are model-local world anchors projected from the active camera and occlusion-tested against the model.
- Scene-graph tests verify real meshes, vertices, named architectural systems and different multi-angle projections independently of headless WebGL.

## Environment verification

Chrome and Playwright must now reach `canvas.viewer-canvas[data-renderer="webgl"]`. Manual acceptance is performed in a hardware-accelerated desktop browser: open the dev URL, confirm the error pill is absent, then drag horizontally to inspect the side and rear.
