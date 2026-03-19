# Lone-Pair Spacing Prompt

Mechanism arrows means only the mechanism arrow tool here.

Implement only lone-pair spacing around directional substituent text.

Own these files only unless absolutely necessary:

- `packages/ketcher-core/src/application/render/restruct/lonePairUtils.ts`
- `packages/ketcher-core/src/application/render/restruct/reatom.ts`
- `packages/ketcher-core/__tests__/application/render/restruct/lonePairUtils.test.ts`

Do not touch:

- any reaction or mechanism arrow files
- any toolbar files
- any settings files
- any atom toggle files
- any select or context-menu files

Requirements:

- Refine lone-pair placement so directional substituent text such as `OH`, `HO`, and equivalent patterns occupies radial space, but less than literal text width.
- Treat inline hydrogens in substituent text more like directional occupancy than full text blocks.
- Add fallback spacing for tight gaps, using the real available gap between the inline hydrogen and the next occupied direction.
- Choose the clearest overall arrangement, including distributing lone pairs across multiple gaps when better than grouping.
- Apply globally to equivalent directional substituent text patterns, not only `OH`.
- Keep explicit bonded hydrogens treated as normal bonds, not text-spacing cases.
- Preserve symmetric natural placements in clean orthogonal geometries.
- Make spacing responsive to actual render settings such as font, font size, line width, lone-pair size, and lone-pair distance.
- Add focused tests for the new layout decisions.

Return:

- changed file list
- tests run
- any edge cases still unresolved
