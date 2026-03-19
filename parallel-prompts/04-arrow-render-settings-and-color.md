# Arrow Render, Settings, And Color Prompt

Mechanism arrows means only the mechanism arrow tool here.

Implement only mechanism-arrow rendering, appearance, clipping, and user settings.

Own these files:

- `packages/ketcher-core/src/application/render/draw.ts`
- `packages/ketcher-core/src/application/render/render.types.ts`
- `packages/ketcher-core/src/application/render/options.ts`
- `packages/ketcher-core/src/application/render/restruct/rerxnarrow.ts`
- `packages/ketcher-react/src/script/ui/data/schema/options-schema.ts`
- `packages/ketcher-react/src/script/ui/views/modal/components/meta/Settings/Settings.tsx`
- `packages/ketcher-react/src/script/ui/views/modal/components/meta/Settings/fieldGroups.js`
- `packages/ketcher-react/src/script/ui/views/toolbars/TopToolbar/TopToolbar.tsx`
- `packages/ketcher-react/src/script/ui/views/toolbars/TopToolbar/TopToolbar.container.ts`
- `packages/ketcher-react/src/script/ui/views/toolbars/TopToolbar/ExternalFuncControls.tsx`
- `packages/ketcher-react/src/script/ui/views/toolbars/toolbar.types.ts`
- `packages/ketcher-react/src/components/Icon/utils/iconNameToIcon.ts` only if needed for toolbar control

Do not touch:

- `packages/ketcher-react/src/script/editor/tool/curlyArrow.ts`
- `packages/ketcher-react/src/script/editor/tool/arrow/reactionArrowMoveTool.ts`
- `packages/ketcher-core/src/application/editor/operations/rxn/RxnArrowResize.ts`
- `packages/ketcher-core/src/application/editor/actions/atom.ts`
- `packages/ketcher-react/src/script/editor/tool/select/select.ts`
- `packages/ketcher-core/src/application/render/restruct/lonePairUtils.ts`
- `packages/ketcher-core/src/application/render/restruct/reatom.ts`

Requirements:

- Update mechanism arrowheads to narrower, more accurate proportions.
- Make mechanism arrow endpoints stop at visible boundaries of bonds, atoms, and lone pairs.
- Keep user-adjustable head and tail sizing, but clamp so settings never push endpoints inside structures.
- Make endpoint clipping responsive to visual settings such as bond thickness, font, and font size.
- Add mechanism-arrow color controls with default black, a small preset list, and a custom-color option in the top toolbar.
- Keep settings and state wiring coherent across defaults, schema, modal settings, and toolbar control.
- Do not change routing logic or preview logic.

Return:

- changed file list
- tests run
- any merge assumptions about arrow-core changes
