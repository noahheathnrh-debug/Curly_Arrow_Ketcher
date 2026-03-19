# Arrow Core And Hydrogen Protection Prompt

Mechanism arrows means only the mechanism arrow tool here.

Implement only mechanism-arrow core behaviour and hydrogen protection.

Own these files:

- `packages/ketcher-react/src/script/editor/tool/curlyArrow.ts`
- `packages/ketcher-react/src/script/editor/tool/arrow/reactionArrowMoveTool.ts`
- `packages/ketcher-react/src/script/editor/tool/select/select.ts`
- `packages/ketcher-react/src/script/ui/views/components/ContextMenu/hooks/useToggleImplicitH.ts`
- `packages/ketcher-react/src/script/ui/views/components/ContextMenu/menuItems/AtomMenuItems.tsx` only if needed for disable state
- `packages/ketcher-core/src/application/editor/actions/atom.ts`
- `packages/ketcher-core/src/application/editor/actions/reaction.ts`
- `packages/ketcher-core/src/application/editor/operations/rxn/index.ts`
- `packages/ketcher-core/src/application/editor/operations/rxn/RxnArrowResize.ts`
- `packages/ketcher-core/src/domain/entities/rxnArrow.ts`
- `packages/ketcher-core/src/application/render/restruct/rerxnarrow.ts`
- `packages/ketcher-core/src/application/render/restruct/restruct.ts`

Do not touch:

- `packages/ketcher-core/src/application/render/draw.ts`
- render option or schema files
- settings UI
- top toolbar UI
- color-setting files
- lone-pair layout files

Requirements:

- Replace the drag preview with a neutral dotted straight line from start point to cursor. No temporary curved preview.
- Make automatic routing choose curvature direction from path quality and obstacles, not left or right bias.
- Enforce sensible outward tail direction, especially from lone pairs and bonds.
- Enforce entry and exit angle constraints so arrows do not begin backwards or end awkwardly.
- Keep curves simple, smooth, and lazy. Allow short arrows tighter but still controlled turns with continuous scaling.
- Improve path generation and control-point behaviour without adding unnecessary complexity.
- Treat nearby atoms, bonds, lone pairs, and surrounding structures as obstacles for routing quality.
- Implement hydrogen protection through the actual toggle action path, so double-click and context-menu behaviour both obey it.
- Prevent hiding or removing a hydrogen while any mechanism arrow is attached to that hydrogen or to one of its visible bonds, regardless of arrow direction.
- Once attached arrows are removed, allow normal toggle behaviour again.
- If needed, introduce explicit endpoint attachment metadata rather than relying on brittle geometry-only checks.
- Add tests where practical.

Return:

- changed file list
- tests run
- whether you introduced new arrow attachment metadata
- any follow-up required from render or settings work
