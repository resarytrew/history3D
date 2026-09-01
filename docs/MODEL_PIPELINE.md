# Model pipeline

## GLB

Самодостаточный glTF 2.0 GLB, +Y up, ground-centred, без внешних URI. Ориентир обычного объекта: до 100–150k triangles; soft ceiling 250k. Для архитектуры допускается отдельный budget после реального mobile profiling и LOD. Проверяются bytes, triangles, draw calls, textures, credits и hash.

## Procedural

Factory создаёт `THREE.Group` и не владеет renderer. Геометрия детерминирована; все материалы и текстуры доступны обходу disposal. Factory регистрируется по стабильному ID. DEV_ONLY factories запрещены production gate.

## Delivery

Poster показывается до первого подтверждённого кадра. Следующий экспонат можно preload в idle. Draco/Meshopt добавляются только когда реальные GLB оправдают decoder cost. Backgrounds и thumbnails поставляются WebP/AVIF; landscape и portrait — отдельные композиции.

