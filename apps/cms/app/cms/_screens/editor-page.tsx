import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { redirect } from "next/navigation";
import { isCmsAuthenticated } from "../_lib/auth";
import LandingEditor from "../editor/landing-editor";
import { readSavedProjectJson } from "@/server/cms-storage";

const siteIndexPath = path.resolve(process.cwd(), "public/site-dist/index.html");
const siteAssetsPath = path.resolve(process.cwd(), "public/site-dist/assets");

type SiteAssets = {
  cssHref: string;
  shortcutsBackgroundHref: string;
};

const editorFlagScript = `<script>
window.__CBDAS_EDITOR_CANVAS__ = true;
window.__CBDAS_ORIGINAL_MATCH_MEDIA__ = window.matchMedia ? window.matchMedia.bind(window) : null;
window.matchMedia = function (query) {
  if (String(query).indexOf("prefers-reduced-motion") !== -1) {
    var listeners = [];

    return {
      matches: true,
      media: query,
      onchange: null,
      addEventListener: function (_type, listener) {
        listeners.push(listener);
      },
      removeEventListener: function (_type, listener) {
        listeners = listeners.filter(function (currentListener) {
          return currentListener !== listener;
        });
      },
      addListener: function (listener) {
        listeners.push(listener);
      },
      removeListener: function (listener) {
        listeners = listeners.filter(function (currentListener) {
          return currentListener !== listener;
        });
      },
      dispatchEvent: function () {
        return false;
      }
    };
  }

  if (window.__CBDAS_ORIGINAL_MATCH_MEDIA__) {
    return window.__CBDAS_ORIGINAL_MATCH_MEDIA__(query);
  }

  return {
    matches: false,
    media: query,
    onchange: null,
    addEventListener: function () {},
    removeEventListener: function () {},
    addListener: function () {},
    removeListener: function () {},
    dispatchEvent: function () {
      return false;
    }
  };
};
window.IntersectionObserver = class {
  constructor(callback) {
    this.callback = callback;
  }

  observe(target) {
    window.setTimeout(() => {
      this.callback(
        [
          {
            boundingClientRect: target.getBoundingClientRect(),
            intersectionRatio: 1,
            intersectionRect: target.getBoundingClientRect(),
            isIntersecting: true,
            rootBounds: null,
            target,
            time: performance.now()
          }
        ],
        this
      );
    }, 0);
  }

  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
};
</script>`;

const snapshotScript = `<script>
(function () {
  var expectedSectionSelectors = [
    "#programacao",
    "#oficinas",
    "#inscricoes",
    "#empenho",
    "#artigos-cientificos",
    "#inscricoes-descontos",
    "#palestrantes",
    "#guia-cbdas",
    "#local",
    "#patrocinadores",
    "#contato"
  ];

  function normalizeUrlAttribute(element, attributeName) {
    var value = element.getAttribute(attributeName);

    if (!value || value.indexOf(window.location.origin + "/") !== 0) {
      return;
    }

    element.setAttribute(attributeName, value.slice(window.location.origin.length));
  }

  function postSnapshot(attempt) {
    var root = document.getElementById("root");

    if (!root) {
      retry(attempt);
      return;
    }

    var text = root.textContent || "";
    var isStillLoading = text.indexOf("Carregando") !== -1 && text.length < 80;
    var missingSections = expectedSectionSelectors.filter(function (selector) {
      return !root.querySelector(selector);
    });

    if ((isStillLoading || missingSections.length > 0) && attempt < 120) {
      retry(attempt);
      return;
    }

    var clone = root.cloneNode(true);

    clone.querySelectorAll("[src]").forEach(function (element) {
      normalizeUrlAttribute(element, "src");
    });

    clone.querySelectorAll("[href]").forEach(function (element) {
      normalizeUrlAttribute(element, "href");
    });

    window.parent.postMessage(
      {
        type: "cbdas-site-snapshot",
        html: clone.outerHTML,
        missingSections: missingSections
      },
      window.location.origin
    );
  }

  function retry(attempt) {
    window.setTimeout(function () {
      postSnapshot(attempt + 1);
    }, 100);
  }

  window.setTimeout(function () {
    postSnapshot(0);
  }, 200);
})();
</script>`;

async function getSiteAssets(): Promise<SiteAssets> {
  const [html, assetFiles] = await Promise.all([
    readFile(siteIndexPath, "utf8"),
    readdir(siteAssetsPath),
  ]);
  const cssMatch = html.match(/href="\.\/(assets\/index-[^"]+\.css)"/);
  const shortcutsBackground = assetFiles.find((fileName) =>
    /^elementosbrasilia2-[\w-]+\.png$/.test(fileName),
  );

  return {
    cssHref: cssMatch ? `/${cssMatch[1]}` : "",
    shortcutsBackgroundHref: shortcutsBackground ? `/assets/${shortcutsBackground}` : "",
  };
}

function rewriteDistUrls(html: string) {
  return html
    .replaceAll('src="./assets/', 'src="/assets/')
    .replaceAll('href="./assets/', 'href="/assets/')
    .replaceAll('src="./tailwind-browser.js"', 'src="/tailwind-browser.js"')
    .replaceAll('href="./logodark.webp"', 'href="/logodark.webp"');
}

function injectEditorScripts(html: string) {
  return html
    .replace("</head>", `${editorFlagScript}</head>`)
    .replace("</body>", `${snapshotScript}</body>`);
}

async function getSnapshotSourceHtml() {
  return injectEditorScripts(rewriteDistUrls(await readFile(siteIndexPath, "utf8")));
}

function getInitialHtml() {
  return `
<div id="root">
  <p style="margin:0;padding:2rem;font-family:Montserrat,sans-serif;color:#10245f">
    Carregando o site original...
  </p>
</div>`;
}

type SavedEditorProject = {
  html: string;
  css: string;
};

async function getSavedEditorProject(): Promise<SavedEditorProject | null> {
  try {
    const project = JSON.parse(await readSavedProjectJson()) as {
      html?: unknown;
      css?: unknown;
    };

    if (typeof project.html === "string" && typeof project.css === "string") {
      return {
        html: project.html,
        css: project.css,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export const dynamic = "force-dynamic";

export default async function EditorPage() {
  if (!(await isCmsAuthenticated())) {
    redirect("/cms");
  }

  const [assets, savedProject] = await Promise.all([getSiteAssets(), getSavedEditorProject()]);
  const snapshotSourceHtml = savedProject ? "" : await getSnapshotSourceHtml();

  return (
    <LandingEditor
      initialHtml={savedProject?.html ?? getInitialHtml()}
      initialCss={savedProject?.css ?? ""}
      siteCssHref={assets.cssHref}
      shortcutsBackgroundHref={assets.shortcutsBackgroundHref}
      snapshotSourceHtml={snapshotSourceHtml}
    />
  );
}
