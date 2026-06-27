/**
 * Back-compat re-export. The implementation moved to `src/applescript/runner.ts`
 * (it is generic, not Safari-specific). Existing imports of `../safari/runner.js`
 * continue to work.
 */
export * from "../applescript/runner.js";
