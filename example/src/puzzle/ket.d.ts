/**
 * Mechanism documents are imported as text.
 *
 * Vite's `?raw` suffix hands back the file contents as a string; TypeScript has
 * no idea what a `.ket` file is, so the shape has to be declared.
 */
declare module '*.ket?raw' {
  const content: string;
  export default content;
}

declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}
