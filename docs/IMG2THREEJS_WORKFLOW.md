# img2threejs workflow

`img2threejs` используется отдельно от сайта как authoring pipeline для шлемов, мечей, топоров, щитов, крестов, сосудов, кораблей и архитектурных деталей.

```text
references/{front,side,rear,drawing}.jpg + measurements.json
→ observed/inferred inventory
→ reconstruction-brief.json + sculpt spec
→ procedural Three.js factory
→ fixed-camera and turntable renders
→ geometry/material/attachment gates
→ review record
→ approved exhibit package
```

Один снимок не равен достоверной 3D-модели. Невидимые стороны, материал и масштаб помечаются inference, пока не найдены дополнительные источники. В runtime переносится только одобренная factory/GLB и её provenance; forge, исходные изображения и промежуточные рендеры остаются в authoring workspace.

