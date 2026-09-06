# Content schema

Главные сущности: `Exhibit`, `HistoricalSource`, `EvidenceItem`, `Hotspot`, `ReconstructionRecord`, `Credit`, `StudentAuthor`, `Collection`. Русский и английский контент — отдельные полные записи; исторический текст не смешивается с UI translations.

`ClaimKind` поддерживает `FACT`, `DERIVED`, `RECONSTRUCTION`, `UNKNOWN`; прежнее `INFERENCE` сохранено для совместимости существующих пакетов. `DERIVED` обозначает вычисление из исходных данных и не выдаётся за отдельно измеренный факт. `uniform` — категория обмундирования. Несколько коллекций регистрируются в `catalog.ts`; lazy procedural factories — в `three/proceduralModelRegistry.ts`.

Publication lifecycle: `draft → research → reconstruction → historical-review → technical-review → approved → published`. Обычная public collection содержит только `published`; review build может показывать остальные с явным статусом.

Версии реконструкции неизменяемы по смыслу: version, date, summary, evidence changes, model hash и reviewers. Это позволяет показать, как историческое знание уточняется.
