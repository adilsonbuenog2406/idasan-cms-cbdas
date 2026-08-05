import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveEditorInitialState } from "../../app/cms/_screens/resolve-editor-initial-state";

describe("resolveEditorInitialState", () => {
  it("loads the last saved/published project and skips site-dist snapshot", () => {
    const state = resolveEditorInitialState({
      savedProject: {
        html: '<div id="root">versao publicada</div>',
        css: ".published {}",
      },
      loadingHtml: "<div>loading</div>",
      snapshotSourceHtml: "<html>site-dist</html>",
    });

    assert.equal(state.initialHtml, '<div id="root">versao publicada</div>');
    assert.equal(state.initialCss, ".published {}");
    assert.equal(state.snapshotSourceHtml, "");
  });

  it("falls back to site-dist snapshot only when nothing is saved", () => {
    const state = resolveEditorInitialState({
      savedProject: null,
      loadingHtml: "<div>loading</div>",
      snapshotSourceHtml: "<html>site-dist</html>",
    });

    assert.equal(state.initialHtml, "<div>loading</div>");
    assert.equal(state.initialCss, "");
    assert.equal(state.snapshotSourceHtml, "<html>site-dist</html>");
  });
});
