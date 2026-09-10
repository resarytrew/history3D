# Проверка Direct Interaction и Hierarchical Assembly

Дата: 10 сентября 2026. Исходный коммит: `d024856`.

## Результат

- Полный Vitest: **84 pass / 9 fail**, 93 теста, пропусков нет.
- Множество падений совпадает с исходным коммитом по suite, test name и причине:
  **0 новых / 0 исчезнувших / 0 неполных suites**.
- Профильные unit/integration: **25/25** (`assembly-v2`, `semantic-controls`,
  `semantic-scene`, `semantic-presentation`, `camera-rig`).
- Playwright: **10/10**, Chromium desktop/mobile, без skipped/flaky.
- Lint, TypeScript, content validation, review build и `git diff --check`: успешно.
- Сборка сохраняет предупреждение о размере Three.js chunk и три предупреждения
  о DEV_ONLY пакетах. Граница публикации контента не изменена.

## Воспроизведение

```powershell
node node_modules/vitest/vitest.mjs run --maxWorkers=2 --hookTimeout=120000 --reporter=json --outputFile=artifacts/assembly-v2-results.json
node node_modules/tsx/dist/cli.mjs scripts/compare-test-baseline.ts artifacts/assembly-v2-baseline-complete.json artifacts/assembly-v2-results.json
node node_modules/@playwright/test/cli.js test e2e/assembly.spec.ts e2e/pistol.spec.ts e2e/content-validation.spec.ts e2e/viewer-lifecycle.spec.ts --reporter=json
npm run lint
npm run build
```

Девять известных падений дают ненулевой exit code полного Vitest. Проверка
сравнения должна завершиться с кодом 0; она также запрещает новые причины и
неполные suites. Изначальная попытка baseline с обычным hook timeout не выполнила
подготовку пистолета. Исходный коммит проверен повторно из отдельной копии с
увеличенным временем beforeAll: все 78 исходных тестов выполнены. Ограничение
workers убирает конкуренцию тяжёлого генератора с остальными suites; assertions
геометрии и поведения не ослаблялись.

Восемь известных ошибок ожидают скрытую коллекцию ancient-rus; девятая — лимит
150000 треугольников при фактических 249480. Они оставлены для отдельного изменения.
Проверка старых кружков пистолета заменена проверкой сохранённых пространственных
anchors и собственных frames трёх признаков/областей. Тесты кружков остальных
экспонатов сохранены.

## Покрытие браузера

320, 390, 768 и 1280 CSS px; procedural и настоящий GLB; overview, lock и trigger;
виртуальная группа и её участники в semantic tree; Back/Assemble all/Restore;
isolate/ghost; direct click; drag с возвратом; touch pinch/cancel; обычная анимация
и её прерывание; reduced-motion; локализация; смена экспоната; WebGL sleep/context
loss; сохранение lazy imports после content validation. GLB-тест проверяет
успешность каждой схемы на всех рабочих размерах и отсутствие дрейфа после reset.

Скриншоты проверены визуально. Панель прокручивается в пределах своей области;
карусель не перекрывает её. Desktop сохраняет заданные направления относительно
ложи. Mobile при необходимости использует детерминированную колонку с высотами
рядов по фактическим bounds деталей.

## Артефакты

- [Baseline](../artifacts/assembly-v2-baseline-complete.json)
- [Текущий полный набор](../artifacts/assembly-v2-results.json)
- [Сравнение падений](../artifacts/assembly-v2-failure-comparison.json)
- [Браузерный отчёт](../artifacts/assembly-v2-browser-results.json)
- [Overview desktop](../artifacts/assembly-overview-1280-chromium.png)
- [Overview mobile](../artifacts/assembly-overview-320-mobile.png)
- [Замок desktop](../artifacts/assembly-v2-1280-chromium.png)
- [Замок mobile](../artifacts/assembly-v2-320-mobile.png)

Временная копия исходного коммита осталась локально в игнорируемом
`artifacts/assembly-v2-baseline-source/`: автоматическая проверка запретила её
удаление. В поставку эта копия не включена.
