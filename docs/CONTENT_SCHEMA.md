# Content schema

Главные сущности: `Exhibit`, `HistoricalSource`, `EvidenceItem`, `Hotspot`, `ReconstructionRecord`, `Credit`, `StudentAuthor`, `Collection`. Русский и английский контент — отдельные полные записи; исторический текст не смешивается с UI translations.

`ClaimKind` поддерживает `FACT`, `DERIVED`, `RECONSTRUCTION`, `UNKNOWN`; прежнее `INFERENCE` сохранено для совместимости существующих пакетов. `DERIVED` обозначает вычисление из исходных данных и не выдаётся за отдельно измеренный факт. `uniform` — категория обмундирования. Несколько коллекций регистрируются в `catalog.ts`; lazy procedural factories — в `three/proceduralModelRegistry.ts`.

Publication lifecycle: `draft → research → reconstruction → historical-review → technical-review → approved → published`. Обычная public collection содержит только `published`; review build может показывать остальные с явным статусом.

Версии реконструкции неизменяемы по смыслу: version, date, summary, evidence changes, model hash и reviewers. Это позволяет показать, как историческое знание уточняется.

## Runtime-проверка

`src/content/schema.ts` содержит Zod-схемы реальных значений: экспоната, источников, evidence, версий, hotspots, GLB/procedural descriptor, presentation, credits, assets, RU/EN visitor content и коллекций. Проверяются конечные числа/векторы, даты, HTTPS-ссылки, обязательные строки и диапазоны камеры.

`src/content/validation.ts` независимо выполняет schema- и graph-проходы: уникальные id/slug/номера точек, sourceIds/sourceRefs, evidenceIds, коллекции и их default/entries. Повреждённое поле не скрывает остальные ошибки. Production принимает только published, запрещает DEV_ONLY и требует полноценные источники и английскую запись.

`scripts/validate-content.ts` загружает исходные модули через Vite SSR, включая реальные asset imports, и сравнивает пакеты с каталогом. Затем проверяет существование/ненулевой размер файлов, размещение внутри репозитория и наличие procedural factory. Asset-проверки продолжаются при ошибках других полей. Сетевой доступ к внешним assets не является условием воспроизводимой сборки; синтаксис URL проверяется схемой.

SSR-валидатор использует отдельный `node_modules/.vite-content-validation`. Общий с dev-сервером кэш Vite использовать нельзя: пересоздание оптимизированных зависимостей ломает ещё не загруженные dynamic imports в открытом viewer. Регрессионный E2E запускает валидацию между показом GLB и первой загрузкой procedural factory в том же документе.

Ошибки собираются в один отчёт, например:

```text
Exhibit: russian-musket-1808
Field: reconstruction.known[2].sourceIds[0]
Error: Unknown source id "missing-source"
```

`npm run validate:content` — review-проверка. `npm run build:production` запускает тот же граф в production-режиме до компиляции; статусы исследований не повышаются автоматически ради успешной сборки.
