export type SavedEditorProject = {
  html: string;
  css: string;
};

export type EditorInitialState = {
  initialHtml: string;
  initialCss: string;
  /** Empty when a saved project exists — avoids overwriting published HTML with site-dist. */
  snapshotSourceHtml: string;
};

/**
 * Prefer the last saved/published GrapesJS project for /cms/editor.
 * Only fall back to a live site-dist snapshot when nothing has been saved yet.
 */
export function resolveEditorInitialState(input: {
  savedProject: SavedEditorProject | null;
  loadingHtml: string;
  snapshotSourceHtml: string;
}): EditorInitialState {
  if (input.savedProject) {
    return {
      initialHtml: input.savedProject.html,
      initialCss: input.savedProject.css,
      snapshotSourceHtml: "",
    };
  }

  return {
    initialHtml: input.loadingHtml,
    initialCss: "",
    snapshotSourceHtml: input.snapshotSourceHtml,
  };
}
