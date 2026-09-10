# Архитектура

[← Документация](README.md)

HISTORIA 3D — статическое приложение React/Vite. Content packages описывают экспонаты, React компонует интерфейс, а отдельные подсистемы Three.js управляют моделью и её представлением.

## Слои

```text
MuseumApp
├─ useMuseumController → museum-state / exhibit-url
├─ content/catalog → коллекция → Exhibit
├─ сведения / исследование / источники / карусель
└─ ExhibitViewer
   ├─ SemanticState → AssemblyControls → дерево / карточка
   └─ ViewerController
      ├─ ModelHost → model-runtime → GLB | lazy factory
      ├─ SemanticSceneIndex → frames / ownership / anchors
      ├─ SemanticPicker → resolveSelection
      ├─ SemanticPresentation → материалы / видимость / picking-policy
      ├─ AssemblyLayoutSolver → AssemblyPose → AssemblySystem
      ├─ CameraRig / LightingRig
      ├─ HotspotSystem — для несемантических экспонатов
      └─ RenderScheduler
```

## Владение состоянием

`useMuseumController` хранит состояние оболочки: активный экспонат, выбранный hotspot, панели, сравнение масштаба и сообщения. URL меняется через History API; `popstate` использует тот же сценарий смены экспоната.

`ExhibitViewer` хранит единый `SemanticState`: `selection`, `displayMode`, `assemblyContext`. Дерево, карточка и runtime получают его через общую команду. Runtime держит применённое представление и переходы; hover остаётся локальным runtime-состоянием. Самостоятельного React-state `selectedEntityId` нет.

Выбор и камера разделены. Переход в layout может рассчитать позу и reference view; обычный выбор solver не запускает и камеру не двигает.

## Семантика и представление

**`part-of` описывает предмет; `Exhibit.assembly` описывает способ его исследования.**

`SemanticSceneIndex` проверяет IDs, parent-связи и исключительное владение геометрией. Для semantic entities создаются frames, а исходная геометрия подключается через замороженные промежуточные группы. Это сохраняет импортированные transforms.

`AssemblyLayoutSolver` получает снимки локальных bounds и baseline matrices, конфигурацию и workspace в CSS px. Он не изменяет сцену. `AssemblySystem` применяет абсолютные смещения относительно baseline и интерполирует их за 550 мс. Потомок наследует итоговое смещение родителя либо заменяет его явным offset.

Виртуальная группа может объединять несколько частей для исследования. Она не появляется в semantic tree или breadcrumb. [Подробные контракты и алгоритм →](SEMANTIC_ASSEMBLY.md)

## Загрузка и ресурсы

`ExhibitModel` — union GLB/procedural. Оба пути возвращают `LoadedExhibitModel { root, dispose }`. Procedural factories загружаются лениво через `proceduralModelRegistry`.

Загрузкой управляют AbortSignal и правило latest-request-wins. Устаревший результат освобождается и не заменяет текущую сцену. ModelHost владеет моделью, LightingRig — освещением и окружением, CameraRig — OrbitControls и переходами, SemanticPresentation — собственными копиями материалов.

Unmount останавливает планировщик, отключает ResizeObserver и listeners, освобождает подсистемы и renderer. Обычная очистка не вызывает принудительную потерю WebGL-контекста, чтобы повторное подключение в StrictMode оставалось корректным.

## Отрисовка и взаимодействие

`RenderScheduler.invalidate()` объединяет запросы в один кадр. Камера, damping и анимация поз поддерживают следующие кадры; в покое непрерывного RAF нет. Контекст WebGL2 запрашивается явно. При потере контекста показывается ошибка.

Picker рассматривает ближайшую видимую поверхность. Пропуск разрешён только явной policy `pick-through`; opacity недостаточно. Hover ограничен одним raycast за кадр. Порог click/drag считается по максимальному отклонению за весь жест.

Workspace исключает панели. Layout пересчитывается при переходе и после resize с debounce 150 мс. Гарантия зазора относится к конечной позе в reference view.

## Каталог и публикация

`content/catalog.ts` содержит три активных экспоната одной review-коллекции. `suspended-catalog.ts` хранит два отключённых пакета без runtime-импорта. Валидатор отдельно проверяет оба набора.

Активность в review-каталоге и статус `published` — разные понятия. Production-проверка требует опубликованных записей и запрещает DEV_ONLY. Текущий каталог не является прошедшей production-публикацией.

## Навигация по исходникам

| Путь | Ответственность |
| --- | --- |
| `src/app/`, `src/state/` | Компоновка музея, reducer, URL и загрузочные координаторы |
| `src/content/` | Контракты, схемы, валидация, коллекции и пакеты |
| `src/features/` | Посетительский интерфейс и React-обвязка viewer |
| `src/three/` | Загрузка, сцена, выбор, позы, освещение и disposal |
| `src/i18n/`, `src/styles/` | UI-тексты и оформление |
| `scripts/` | Валидация, авторинг, экспорт и контрольные рендеры |
| `tests/`, `e2e/` | Unit/integration и браузерные сценарии |

Backend, CMS, физическая симуляция и редактор схем не входят в текущую архитектуру runtime.
