"use client";

import { createContext, useContext } from "react";

/**
 * Preview and PDF export render the exact same block components with editing
 * affordances switched off, which is what keeps the export faithful to the
 * canvas.
 */
export const ReadOnlyContext = createContext(false);

export function useReadOnly(): boolean {
  return useContext(ReadOnlyContext);
}
