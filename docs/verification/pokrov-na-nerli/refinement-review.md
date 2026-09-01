# Pokrov-na-Nerli refinement review

The images in this directory are deterministic CPU projections of the same Three.js geometry used by the WebGL runtime. They are a headless verification aid, not a replacement renderer in the application.

## Pass 1 — silhouette and proportions

Captures: `pass-1-front.png`, `pass-1-three-quarter.png`, `pass-1-side.png`, `pass-1-rear.png`.

- Observed deviation: the blockout read as a tall single-domed volume but lacked the facade rhythm and the drum was visually blank.
- Correction: retained the compact vertical envelope, three eastern apses, zakomara crown and onion dome; moved all openings and articulation to the structural pass instead of faking them with textures.

## Pass 2 — architectural structure

Captures: `pass-2-front.png`, `pass-2-three-quarter.png`, `pass-2-side.png`, `pass-2-rear.png`.

- Observed deviation: facade divisions, portals and windows established identity, but broad wall fields remained flat and the horizontal belt was absent.
- Correction: added modular pilasters, nested perspective archivolts, narrow arched window systems, apse articulation and drum openings as independent geometry.

## Pass 3 — material, details and environment integration

Captures: `pass-3-front.png`, `pass-3-three-quarter.png`, `pass-3-side.png`, `pass-3-rear.png`.

- Observed deviation: the structural pass was too clean and lacked the small-scale rhythm visible in the reference.
- Correction: added the arcade-column belt, capitals, mini-arches, relief medallions, cornices, drum pilasters and restrained limestone material variation. The east crown was closed with real zakomara geometry so rear views do not expose the roof blockout.

## Final anti-billboard gate

`front.png`, `right.png`, `rear.png`, and `left.png` are 0°/90°/180°/270° projections. Their SHA-256 projection signatures are recorded in `metrics.json`; all four are distinct. The rear exposes three apse volumes, and the side view turns the cross edge-on, both of which are impossible for a camera-facing plane.

