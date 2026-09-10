# Pokrov-na-Nerli procedural reconstruction spec

> **Спецификация сохранённого экспериментального пакета.** Покров на Нерли исключён из активного runtime-каталога. Пропорции и ограничения ниже относятся к ранней DEV_ONLY-модели, а не к натурному обмеру. [Текущая архитектура](ARCHITECTURE.md) · [Документация](README.md).

Method: reference analysis → macro/meso/micro decomposition → blockout → structure → form → material → review → correction. The workflow follows the locally audited `img2threejs` authoring methodology; no package code or runtime dependency is copied.

## Coordinate and scale convention

- Model-local metres, `+Y` up.
- West entrance faces `+Z` and the three eastern apses face `-Z`.
- Ground origin is the centre of the foundation.
- Approximate visual envelope: 3.6 m × 4.5 m at the body, 9.1 m to the cross in model scale. These are presentation proportions, not survey measurements.

## Visual decomposition

### Macro

| Status | Decision |
| --- | --- |
| Observed | Tall, compact, single-domed white-stone church; narrow vertical body; onion dome and Orthodox cross. |
| Inferred | Hidden rear follows the same three-bay structural rhythm while the east terminates in three apses. |
| Simplified | Overall dimensions are derived from image ratios, not a measured survey. |
| Unknown | Exact XII-century roof profile, construction phases, settlement and later alterations. |

### Meso

| Status | Decision |
| --- | --- |
| Observed | Three-part facade division, projecting pilasters, zakomaras, narrow arched windows, portals, arcade-column belt, tall drum, three eastern apses. |
| Inferred | North and south repeat the principal vertical bay rhythm; unseen joins are mirrored where reference evidence is absent. |
| Simplified | Zakomaras and portal archivolts use repeated extruded arch profiles; roofs do not reproduce every masonry joint. |
| Unknown | Exact depth and curvature of hidden eastern and roof intersections. |

### Micro

| Status | Decision |
| --- | --- |
| Observed | Slender colonnettes, small arches, recessed openings, cornice bands, relief zones, dark metal dome, warm gold cross. |
| Inferred | Repeated details share modular proportions and materials. |
| Simplified | Relief sculpture is represented by shallow geometric medallions and bands; no claim is made for iconographic accuracy. |
| Unknown | Individual carving subjects, weathering chronology, exact limestone colour under neutral light. |

## Refinement passes

1. **Silhouette and proportions:** stepped foundation, tall rectangular volume, triple east apse, zakomara crown, drum, onion dome and cross.
2. **Architectural structure:** named north/south/west facades, pilasters, three bays, perspective portals, window system, arcade-column belt, drum windows and cornices.
3. **Material and integration:** warm limestone PBR materials with restrained tonal variation, rough dark roof/dome, shallow recess material, shadows and environment-matched sun direction.

## Review notes

- Front and three-quarter views should read as the supplied contemporary reference.
- Side views must expose real depth, side portals and the facade rhythm.
- Rear view must reveal three independent apses, proving it is not a billboard or textured plane.
- Remaining uncertainty is explicitly historical: this is a source-guided interpretive reconstruction, not a scan or measured conservation model.
