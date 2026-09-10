# Контракты данных

[← Документация](README.md)

Источники истины: [types.ts](../src/content/types.ts), [semantics.ts](../src/content/semantics.ts), [assembly.ts](../src/content/assembly.ts), [schema.ts](../src/content/schema.ts) и [validation.ts](../src/content/validation.ts).

## Пакет экспоната

`Exhibit` объединяет идентичность, chronology/geography, reconstruction record, модель, presentation, hotspots, RU/EN content, sources, credits и assets. Необязательные `semantics`, `annotations` и `assembly` подключают прямое исследование структуры.

| Контракт | Назначение |
| --- | --- |
| `HistoricalSource` | Библиография или музейная запись, адрес, дата обращения, оговорки |
| `EvidenceItem` | Утверждение, тип, confidence, sourceIds и точные sourceRefs |
| `ReconstructionVersion` | Версия, дата, summary, status, необязательный modelHash |
| `Hotspot` | Пространственная точка, наблюдение и evidence references для прежнего UI |
| `SemanticEntity` | Стабильный ID, kind, parentId, geometry binding и focusAnchor |
| `EntityAnnotation` | Материал о сущности, независимый от места наблюдения |
| `AssemblyConfig` | Reference view и именованные схемы представления |
| `Credit` | Роль автора/группы и сведения об использовании материалов |

`ExhibitModel` различает `{ kind: 'glb', src, normalization? }` и `{ kind: 'procedural', factoryId, developmentOnly, approximateTriangles }`. Поле в типе ещё не означает готовую runtime-функцию: например, загрузчик сейчас не подключает Draco-декодер только по наличию `dracoDecoderPath`.

## Утверждения и статусы

`ClaimKind`: `FACT`, `DERIVED`, `INFERENCE`, `RECONSTRUCTION`, `UNKNOWN`. Уровень уверенности хранится отдельно: `high | medium | low | unknown`.

Жизненный цикл записи:

```text
draft → research → reconstruction → historical-review
      → technical-review → approved → published
```

Это статусы данных, а не автоматический процесс согласования. Review-сборка может показывать неопубликованную запись; production validator её отклонит.

## Семантические сущности

`kind` различает `object`, `assembly`, `part`, `region`, `feature`. `parentId` описывает историческое отношение принадлежности. `geometry.objectNames` задаёт владение именованными объектами модели; для физической части binding обязателен.

Region/feature могут не иметь собственной геометрии. Их `focusAnchor.entityId` должен совпадать с ID сущности. При авторинге мировая точка переводится в её frame через `anchorFromWorld`, даже если луч попал в mesh несущей детали.

Прежнее `explodeOffset` сохраняется в типах для совместимости данных. Новый Assembly им не управляется: целевые смещения задаются через `AssemblyPose`.

## Аннотации

`EntityAnnotation.entityId` определяет, **о чём материал**. Необязательный `anchor` определяет, **где наблюдать**. Эти ссылки могут различаться. Нельзя автоматически назначать весь текст владельцу mesh, в который попал луч.

Сохраняются ID, описание, observationQuestion и evidenceIds. Материалы о целом показываются отдельно от описания выбранной детали. Для пистолета аудит шести исходных материалов закреплён тестами.

## Представление Assembly

Группа содержит ID, RU/EN label, `selectionTarget`, `memberEntityIds`, `moveEntityIds`, экранное `preferredDirection`, необязательные `fixed` и `drilldownLayoutId`. Группы с несколькими семантическими соответствиями выбираются как `layout-group`.

`AssemblyPose.offsets` хранит суммарные абсолютные смещения относительно baseline. Дубли не перезаписываются: фабрика позы отклоняет их до создания Map. Конфигурация не меняет `part-of`.

[Полная спецификация →](SEMANTIC_ASSEMBLY.md)

## Валидация

Zod проверяет форму значений, строки, конечные векторы, даты и URL. Независимые graph-проходы проверяют ссылки и уникальность, semantic parents, memberships, move frames, переходы layouts и evidence.

`validate-content.ts` загружает реальные модули через Vite SSR, проверяет обязательные файлы пакетов и assets, активный и отключённый каталоги, регистрацию factories. Отдельный кэш SSR не должен нарушать lazy imports открытого dev-viewer.

Текущая схема по-прежнему требует `hotspots` с минимум тремя элементами и файл `hotspots.ts` даже у семантического пакета. Runtime пистолета не рисует эти кружки, но удалять legacy-поле без миграции схемы нельзя. Точно так же файл `content.en.ts` обязателен для пакета, хотя `Exhibit.content.en` в review-схеме необязателен.

Автоматический валидатор не проверяет содержание внешнего источника и не заменяет историческую экспертизу.
