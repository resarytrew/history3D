# HISTORIA 3D

Интерактивный музей исторических 3D-реконструкций. Первый вертикальный срез — зал «Древняя Русь» и исследовательский экран церкви Покрова на Нерли.

Проект показывает не «готовую истину», а связь между источниками, наблюдением, реконструкцией и неопределённостью. Первая процедурная модель — `DEV_ONLY`: она проверяет viewer, камеру, hotspots и адаптивный интерфейс, но не является научной реконструкцией.

## Запуск

```bash
npm install
npm run dev
```

Полная проверка review-сборки:

```bash
npm run lint
npm run typecheck
npm test
npm run validate:content
npm run build
npm run test:e2e
npm run verify:3d
```

`npm run verify:3d` validates the scene graph and writes front/right/rear/left plus three refinement-pass captures to `docs/verification/pokrov-na-nerli/`.

Manual 3D acceptance: use a hardware-accelerated desktop browser, open the local dev URL, confirm the canvas has `data-renderer="webgl"`, drag horizontally across the church to expose the side/rear, zoom with the wheel, and use reset to restore the initial camera. Development remounts are StrictMode-safe: normal cleanup disposes Three.js resources without forcibly losing the canvas context.

`npm run build` создаёт review-сборку с временной моделью. `npm run build:production` применяет строгий publication gate и намеренно не пропустит `DEV_ONLY` или неопубликованный экспонат.

## Архитектура

`collection → exhibit registry → exhibit package → universal viewer`. UI не знает деталей храма: новый объект добавляется content package. Viewer принимает GLB и procedural factories через единый контракт.

- [Видение](docs/PRODUCT_VISION.md)
- [Архитектура](docs/ARCHITECTURE.md)
- [Анализ референсов](docs/REFERENCE_ANALYSIS.md)
- [Как добавить экспонат](docs/EXHIBIT_AUTHORING_GUIDE.md)
- [Политика исторической точности](docs/HISTORICAL_ACCURACY_POLICY.md)

## Лицензия

Код HISTORIA 3D распространяется по MIT. Данные, модели, изображения и аудио имеют собственные provenance-записи и не получают лицензию кода автоматически.
