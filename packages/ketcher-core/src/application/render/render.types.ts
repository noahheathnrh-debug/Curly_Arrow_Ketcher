import type { RxnArrowMode } from 'domain/entities/rxnArrow';
import type { Vec2 } from 'domain/entities/vec2';
import type {
  StereoColoringType,
  StereoLabelStyleType,
} from 'application/render/restruct/generalEnumTypes';
import type { UsageInMacromolecule } from './render.constants';

export { UsageInMacromolecule } from './render.constants';

export type RenderOptionStyles = Record<string, string | number>;

export enum MeasurementUnits {
  Px = 'px',
  Cm = 'cm',
  Pt = 'pt',
  Inch = 'inch',
}

export enum ChargeDisplayStyle {
  Standard = 'standard',
  Circled = 'circled',
}

export type RenderOptions = {
  width?: number;
  height?: number;

  rotationStep?: number;
  bondSpacing: number;
  bondLength: number;
  bondLengthUnit: MeasurementUnits;
  stereoBondWidth: number;
  stereoBondWidthUnit: MeasurementUnits;
  bondThickness: number;
  bondThicknessUnit: MeasurementUnits;

  downScale?: boolean;
  rescaleAmount?: number;
  radiusScaleFactor: number;

  'dearomatize-on-load'?: boolean;
  ignoreChiralFlag?: boolean;
  disableQueryElements?: string[] | null;

  showAtomIds: boolean;
  showBondIds: boolean;
  showHalfBondIds: boolean;
  showLoopIds: boolean;
  showValenceWarnings: boolean;
  showLonePairs: boolean;
  lonePairSize: number;
  lonePairDistance?: number;
  autoScale: boolean;
  autoScaleMargin: number;
  maxBondLength: number;
  atomColoring: boolean;
  hideImplicitHydrogen: boolean;
  hideTerminalLabels: boolean;
  carbonExplicitly: boolean;
  showCharge: boolean;
  chargeDisplayStyle: ChargeDisplayStyle;
  chargeSize: number;
  /**
   * Styling for curly/fishhook mechanism arrows only. Exposed as options so a
   * downstream app can restyle electron-pushing arrows without forking the
   * renderer — reaction arrows are unaffected.
   */
  mechanismArrowColor?: string;
  /** Mechanism arrow stroke as a multiple of the bond stroke width. */
  mechanismArrowWidthScale?: number;
  showHydrogenLabels: string;
  showValence: boolean;
  aromaticCircle: boolean;
  microModeScale: number;
  macroModeScale: number;
  zoom: number;
  offset: Vec2;
  lineWidth: number;

  bondSpace: number;
  stereoBond: number;
  subFontSize: number;
  font: string;
  fontsz: number;
  fontszUnit: MeasurementUnits;
  fontszsubUnit: MeasurementUnits;
  fontszsub: number;
  fontRLabel: number;
  fontRLogic: number;

  hashSpacing: number;
  hashSpacingUnit: MeasurementUnits;

  /* styles */
  lineattr: RenderOptionStyles;
  multitailArrow: RenderOptionStyles;
  arrowSnappingStyle: RenderOptionStyles;
  bondSnappingStyle: RenderOptionStyles;
  selectionStyle: RenderOptionStyles;
  hoverStyle: RenderOptionStyles;
  innerHoverStyle: RenderOptionStyles;
  movingStyle: RenderOptionStyles;
  sgroupBracketStyle: RenderOptionStyles;
  lassoStyle: RenderOptionStyles;
  selectionStyleSimpleObject: RenderOptionStyles;
  hoverStyleSimpleObject: RenderOptionStyles;
  atomSelectionPlateRadius: number;
  contractedFunctionalGroupSize: number;

  stereoLabelStyle?: StereoLabelStyleType;
  colorStereogenicCenters: StereoColoringType;

  previewOpacity: number;

  connectedMonomerAttachmentPoints?: string[];
  currentlySelectedMonomerAttachmentPoint?: string;
  labelInMonomerConnectionsModal?: boolean;
  labelInPreview?: boolean;

  // Converted
  fontszInPx: number;
  fontszsubInPx: number;
  bondSpacingInPx: number;
  bondThicknessInPx: number;
  stereoBondWidthInPx: number;
  hashSpacingInPx: number;
  usageInMacromolecule?: UsageInMacromolecule;
  viewOnlyMode?: boolean;
};

export interface RelativeBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ArrowItem {
  mode?: RxnArrowMode;
  pos: Vec2[];
  height: number;
  height2?: number;
  /** Control-point positions along the chord, as a fraction of its length. */
  along1?: number;
  along2?: number;
  /**
   * Interior turn points of a mechanism arrow, in canvas units, ordered from
   * the tail.
   *
   * Empty or absent for an ordinary arrow, which is a single cubic. Each entry
   * describes the segment *ending* at its own `at`, and the last segment runs
   * from the final turn point to `pos[1]` using the item's own height/along
   * fields. Consecutive segments share a tangent where they meet, so however
   * many there are they draw as one smooth stroke in a single path.
   */
  leads?: Array<{
    at: Vec2;
    height: number;
    height2: number;
    along1: number;
    along2: number;
  }>;
}

export type ViewBox = {
  minX: number;
  minY: number;
  width: number;
  height: number;
};
