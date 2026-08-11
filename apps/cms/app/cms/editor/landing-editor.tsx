"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Asset, Component, Editor } from "grapesjs";

type LandingEditorProps = {
  initialHtml: string;
  initialCss: string;
  siteCssHref: string;
  shortcutsBackgroundHref: string;
  snapshotSourceHtml: string;
};

type SnapshotHeaderState = {
  topLogoSrc: string;
  scrolledLogoSrc: string;
};

type ImageContextMenuState = {
  x: number;
  y: number;
  mode: "menu" | "upload";
  isUploading: boolean;
  isDragOver: boolean;
  error: string;
};

const draftKey = "cbdas_landing_grapesjs_original_site_v2";
const snapshotViewport = {
  width: 1440,
  height: 900,
};
const heroSubtitleText = "Em Brasília de 20 a 21 de agosto de 2026";
const heroSubtitleScreenReaderText =
  "Em Brasília de 20 a 21 de agosto de 2026. IIIº Congresso Brasileiro de Direito Administrativo Sancionador.";
const headerTopClassName =
  "fixed top-0 left-0 right-0 z-50 transition-all duration-300 py-6 bg-transparent";
const headerScrolledClassName =
  "fixed top-0 left-0 right-0 z-50 transition-all duration-300 py-3 bg-white/90 backdrop-blur-md shadow-md";
const desktopToggleLayoutClassName =
  "header-desktop-toggle items-center gap-2 rounded-full border px-4 py-2 transition-colors hidden lg:flex";
const desktopToggleTopToneClassName = "border-white/20 bg-white/10 text-white";
const desktopToggleScrolledToneClassName = "border-slate-200 bg-white text-idasan-blue shadow-sm";
const headerMenuItems = [
  { label: "Inscrições", href: "#inscricoes" },
  { label: "Programação", href: "#programacao" },
  { label: "Oficinas", href: "#oficinas" },
  { label: "Palestrantes Confirmados", href: "#palestrantes" },
  { label: "Patrocinadores", href: "#patrocinadores" },
  { label: "Submissão de Artigos", href: "#artigos-cientificos" },
  { label: "Guia", href: "#guia-cbdas" },
  { label: "Local", href: "#local" },
  { label: "Contato", href: "#contato" },
];
const expectedSectionSelectors = [
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
  "#contato",
];
const programDayIds = ["day-1", "day-2"] as const;

type ProgramDayId = (typeof programDayIds)[number];

const programDayLabels: Record<ProgramDayId, string> = {
  "day-1": "Dia 1 — 20/08",
  "day-2": "Dia 2 — 21/08",
};
const speakerBlockContent = `
<article
  data-cbdas-speaker-card="true"
  role="listitem"
  class="group relative overflow-hidden rounded-[28px] border border-[#10224f]/12 bg-[#071736] shadow-[0_32px_80px_-46px_rgba(6,21,57,0.72)] transition-all duration-700 ease-out hover:-translate-y-1 hover:shadow-[0_34px_90px_-42px_rgba(6,21,57,0.82)] translate-y-0 opacity-100"
  style="transition-delay: 0ms;"
>
  <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18)_0%,_transparent_34%)]"></div>
  <div class="relative h-[483px] w-full overflow-hidden">
    <img
      src="/assets/michaeldejesus-oQOIvvRs.png"
      alt="Retrato de Michael de Jesus, Doutor em Direito Financeiro pela USP. Procurador do Município de Guarujá."
      loading="lazy"
      decoding="async"
      class="h-full w-full object-cover"
      style="object-position: center top;"
    />
  </div>
  <div class="absolute inset-0 bg-gradient-to-t from-[#061539]/88 via-[#061539]/28 to-transparent"></div>
  <div class="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#061539]/84 via-[#061539]/32 to-transparent"></div>
  <div class="absolute bottom-3 left-3 right-3 overflow-hidden rounded-[24px] border border-white/20 bg-white/12 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:p-5">
    <div class="pointer-events-none absolute -right-5 -top-5 h-20 w-20 rounded-full bg-white/18 blur-2xl"></div>
    <div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-white/0 via-white/60 to-white/0"></div>
    <div class="relative min-w-0">
      <h3 class="text-base font-semibold tracking-[0.01em] text-white">Michael de Jesus</h3>
      <p class="mt-1 text-sm font-medium text-white/90">Doutor em Direito Financeiro pela USP. Procurador do Município de Guarujá</p>
    </div>
  </div>
</article>
`;
const speakerCardSelector = "[data-cbdas-speaker-card]";
const speakerListSelector = "[data-cbdas-speakers-list]";
const panelistCardSelector = "[data-speaker-card]";
const panelistDefaultImageSrc = "/assets/michaeldejesus-oQOIvvRs.png";
const panelistDefaultName = "Nome do painelista";
const panelistDefaultRole = "Cargo ou instituicao";
const panelistSizeClasses = [
  "speaker-card--small",
  "speaker-card--medium",
  "speaker-card--large",
];
const panelistAlignmentClasses = ["speaker-card--align-left", "speaker-card--align-center"];
const panelistImagePositionClasses = ["speaker-card--image-left", "speaker-card--image-right"];
const panelistWidthClasses = [
  "speaker-card--width-auto",
  "speaker-card--width-25",
  "speaker-card--width-50",
  "speaker-card--width-75",
  "speaker-card--width-100",
];
const panelistBlockIcon = `
<svg viewBox="0 0 24 24" aria-hidden="true" style="display:block;max-width:26px;margin:0 auto 6px;">
  <path fill="currentColor" d="M15 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Zm-4 6c-3.31 0-6 1.57-6 3.5V22h12v-1.5c0-1.93-2.69-3.5-6-3.5Z" />
  <path fill="currentColor" d="M19 4h-2V2h-2v2h-2v2h2v2h2V6h2V4Z" />
</svg>
`;

function normalizeUrl(value: string) {
  if (value.startsWith(`${window.location.origin}/`)) {
    return value.slice(window.location.origin.length);
  }

  return value;
}

function normalizeSnapshotUrls(root: HTMLElement) {
  root.querySelectorAll("[src]").forEach((element) => {
    const value = element.getAttribute("src");

    if (value) {
      element.setAttribute("src", normalizeUrl(value));
    }
  });

  root.querySelectorAll("[href]").forEach((element) => {
    const value = element.getAttribute("href");

    if (value) {
      element.setAttribute("href", normalizeUrl(value));
    }
  });
}

function freezeHeroSubtitle(root: HTMLElement) {
  const subtitle = Array.from(root.querySelectorAll<HTMLElement>(".type-subtitle")).find(
    (element) => element.textContent?.includes(heroSubtitleText),
  );

  if (!subtitle) {
    return;
  }

  subtitle.replaceChildren();

  const visibleText = document.createElement("p");
  visibleText.className = "flex min-h-[inherit] items-center justify-center text-center";
  visibleText.textContent = heroSubtitleText;

  const screenReaderText = document.createElement("span");
  screenReaderText.className = "sr-only";
  screenReaderText.textContent = heroSubtitleScreenReaderText;

  subtitle.append(visibleText, screenReaderText);
}

function ensureLayer(wrapper: HTMLElement, index: number) {
  const currentLayer = wrapper.children.item(index);

  if (currentLayer instanceof HTMLElement) {
    return currentLayer;
  }

  const layer = document.createElement("div");
  layer.className = "absolute inset-0 mix-blend-multiply";
  wrapper.append(layer);

  return layer;
}

function restoreShortcutsBackground(root: HTMLElement, shortcutsBackgroundHref: string) {
  if (!shortcutsBackgroundHref) {
    return;
  }

  const band = Array.from(root.querySelectorAll<HTMLElement>("section")).find((section) =>
    section.getAttribute("aria-label")?.includes("Acessos rápidos"),
  );

  if (!band) {
    return;
  }

  let artworkWrapper = Array.from(band.querySelectorAll<HTMLElement>("div")).find((element) =>
    element.className.includes("pointer-events-none absolute inset-0 z-0"),
  );

  if (!artworkWrapper) {
    artworkWrapper = document.createElement("div");
    artworkWrapper.className =
      "pointer-events-none absolute inset-0 z-0 hidden overflow-hidden md:block";
    band.insertBefore(artworkWrapper, band.firstElementChild?.nextElementSibling ?? null);
  }

  artworkWrapper.setAttribute("data-cbdas-shortcuts-art", "");
  artworkWrapper.style.opacity = "1";
  artworkWrapper.style.transform = "none";

  const softLayer = ensureLayer(artworkWrapper, 0);
  softLayer.setAttribute("data-cbdas-shortcuts-art-layer", "soft");
  softLayer.className = "absolute inset-0 opacity-[0.15] mix-blend-multiply";
  softLayer.style.backgroundImage = `url("${shortcutsBackgroundHref}")`;
  softLayer.style.backgroundPosition = "left center";
  softLayer.style.backgroundRepeat = "repeat-x";
  softLayer.style.backgroundSize = "auto 100%";
  softLayer.style.filter = "grayscale(1) brightness(0.18) contrast(1.08) blur(0.45px)";

  const sharpLayer = ensureLayer(artworkWrapper, 1);
  sharpLayer.setAttribute("data-cbdas-shortcuts-art-layer", "sharp");
  sharpLayer.className = "absolute inset-0 opacity-[0.24] mix-blend-multiply";
  sharpLayer.style.backgroundImage = `url("${shortcutsBackgroundHref}")`;
  sharpLayer.style.backgroundPosition = "left center";
  sharpLayer.style.backgroundRepeat = "repeat-x";
  sharpLayer.style.backgroundSize = "auto 100%";
  sharpLayer.style.filter = "grayscale(1) brightness(0.06) contrast(1.04)";
}

function markHeroForEditorSpacing(root: HTMLElement) {
  const hero = Array.from(root.querySelectorAll<HTMLElement>("section")).find((section) =>
    section.className.includes("bg-[#061539]"),
  );

  hero?.setAttribute("data-cbdas-editor-hero", "");
}

function getEditorRestorationCss(shortcutsBackgroundHref: string) {
  const backgroundHref = shortcutsBackgroundHref.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  const shortcutsBackgroundCss = shortcutsBackgroundHref
    ? `
[data-cbdas-shortcuts-art-layer="soft"],
[data-cbdas-shortcuts-art-layer="sharp"] {
  background-image: url("${backgroundHref}") !important;
  background-position: left center !important;
  background-repeat: repeat-x !important;
  background-size: auto 100% !important;
}

[data-cbdas-shortcuts-art-layer="soft"] {
  filter: grayscale(1) brightness(0.18) contrast(1.08) blur(0.45px) !important;
}

[data-cbdas-shortcuts-art-layer="sharp"] {
  filter: grayscale(1) brightness(0.06) contrast(1.04) !important;
}
`
    : "";

  return `
[data-cbdas-shortcuts-art] {
  opacity: 1 !important;
  transform: none !important;
}

${shortcutsBackgroundCss}

@media (min-width: 1024px) and (max-height: 840px) {
  [data-cbdas-editor-hero] {
    min-height: calc(100vh + 3.5rem) !important;
  }
}

[data-cbdas-speakers-list] {
  min-height: 483px;
}

[data-cbdas-speakers-list] [data-cbdas-speaker-card] {
  min-height: 483px;
  width: 100%;
}

[data-cbdas-speakers-list] .gjs-placeholder,
[data-cbdas-speakers-list] .gjs-placeholder-horizontal,
[data-cbdas-speakers-list] .gjs-placeholder-vertical {
  min-height: 483px !important;
  width: 100% !important;
  border: 2px dashed #f9d600 !important;
  border-radius: 28px !important;
  background:
    linear-gradient(180deg, rgba(249, 214, 0, 0.16), rgba(249, 214, 0, 0.05)),
    rgba(7, 23, 54, 0.1) !important;
  box-shadow: inset 0 0 0 1px rgba(28, 39, 81, 0.18) !important;
}

@media (min-width: 1024px) {
  header.fixed .header-shell > .header-desktop-nav,
  header.fixed .header-shell > .header-desktop-cta {
    display: none !important;
  }

  header.fixed .header-desktop-links {
    display: none !important;
  }

  header.fixed .header-desktop-toggle {
    display: flex !important;
  }

  header.fixed .header-desktop-nav {
    flex: 0 0 auto !important;
    min-width: 0 !important;
  }
}
`;
}

function getHeaderLogoSrc(root: HTMLElement) {
  const logo = root.querySelector<HTMLImageElement>("img.header-brand-image");

  return logo?.getAttribute("src") ?? "";
}

function applyHeaderTone(document: Document, isScrolled: boolean, headerState: SnapshotHeaderState) {
  const header = document.querySelector<HTMLElement>("header.fixed");

  if (!header) {
    return;
  }

  header.className = isScrolled ? headerScrolledClassName : headerTopClassName;

  const logo = header.querySelector<HTMLImageElement>("img.header-brand-image");
  const nextLogoSrc = isScrolled ? headerState.scrolledLogoSrc : headerState.topLogoSrc;

  if (logo && nextLogoSrc) {
    logo.setAttribute("src", nextLogoSrc);
  }

  const desktopToggle = header.querySelector<HTMLButtonElement>(".header-desktop-toggle");

  if (desktopToggle) {
    desktopToggle.className = `${desktopToggleLayoutClassName} ${
      isScrolled ? desktopToggleScrolledToneClassName : desktopToggleTopToneClassName
    }`;
  }

  header.querySelectorAll<SVGElement>("button:not(.header-desktop-toggle) svg").forEach((icon) => {
    icon.className.baseVal = isScrolled ? "text-idasan-blue" : "text-white";
  });

  header.querySelectorAll<HTMLAnchorElement>(".header-desktop-links a.header-nav-link").forEach(
    (link) => {
      const sponsorLayout = link.querySelector("svg") ? " flex items-center gap-1.5" : "";
      link.className = `header-nav-link type-nav whitespace-nowrap${sponsorLayout} transition-colors hover:text-idasan-yellow ${
        isScrolled ? "text-gray-700" : "text-white/90"
      }`;
    },
  );
}

function getHeaderMenuOptionName(component: Component) {
  const element = getComponentViewElement(component);
  const text = element?.textContent?.replace(/\s+/g, " ").trim();

  return text || "Opcao do menu";
}

function configureHeaderMenuComponents(editor: Editor) {
  const wrapper = editor.getWrapper();

  if (!wrapper) {
    return;
  }

  wrapper.find("[data-cbdas-editor-header-dropdown]").forEach((dropdown) => {
    dropdown.set({
      name: "Menu do header",
      selectable: true,
      hoverable: true,
      layerable: true,
      draggable: false,
      droppable: true,
    });
  });

  wrapper.find("[data-cbdas-header-menu-option]").forEach((option) => {
    option.set({
      name: getHeaderMenuOptionName(option),
      selectable: true,
      editable: true,
      hoverable: true,
      layerable: true,
      draggable: false,
      droppable: false,
      traits: [
        { type: "text", name: "href", label: "Link" },
        { type: "text", name: "target", label: "Target" },
      ],
    } as Record<string, unknown>);
  });
}

function buildHeaderDropdownHtml() {
  const menuLinks = headerMenuItems
    .map(
      (item) => `
        <a
          data-cbdas-header-menu-option="true"
          href="${item.href}"
          class="header-dropdown-link type-nav rounded-2xl px-4 py-3 text-idasan-blue transition-colors hover:text-idasan-blue"
        >${item.label}</a>`,
    )
    .join("");

  return `
    <div
      data-cbdas-editor-header-dropdown="true"
      class="header-dropdown-shell hidden lg:block"
      style="display: block;"
    >
      <div class="header-dropdown-wrap container mx-auto px-4 md:px-6">
        <div class="header-dropdown-panel w-full p-5 md:p-6">
          <div class="header-dropdown-grid grid gap-3 md:grid-cols-2">
            ${menuLinks}
            <a
              data-cbdas-header-menu-option="true"
              href="#patrocinadores"
              target="_blank"
              rel="noopener noreferrer"
              class="header-dropdown-link type-nav flex items-center justify-between rounded-2xl px-4 py-3 text-idasan-blue transition-colors hover:text-idasan-blue"
            >Seja um patrocinador</a>
          </div>
          <div class="header-dropdown-action mt-5 flex justify-center">
            <a
              data-cbdas-header-menu-option="true"
              href="#inscricoes"
              class="inline-flex items-center justify-center rounded-full bg-idasan-yellow px-6 py-3 type-button text-idasan-blue shadow-sm"
            >Inscreva-se</a>
          </div>
        </div>
      </div>
    </div>`;
}

function setCanvasHeaderMenuExpanded(editor: Editor, isExpanded: boolean) {
  const canvasDocument = editor.Canvas.getDocument();

  canvasDocument
    ?.querySelectorAll<HTMLButtonElement>("header.fixed .header-desktop-toggle")
    .forEach((button) => {
      button.setAttribute("aria-expanded", String(isExpanded));
    });
}

function toggleCanvasHeaderMenu(editor: Editor) {
  const canvasDocument = editor.Canvas.getDocument();
  const header = canvasDocument?.querySelector<HTMLElement>("header.fixed");

  if (!header) {
    return;
  }

  const headerComponent = getComponentForElement(editor, header);

  if (!headerComponent) {
    return;
  }

  const existingDropdown = headerComponent.find("[data-cbdas-editor-header-dropdown]")[0];
  const currentDisplay = existingDropdown?.getStyle().display;
  const isCurrentlyVisible = Boolean(existingDropdown) && currentDisplay !== "none";
  const nextVisible = !isCurrentlyVisible;
  const dropdown = existingDropdown ?? headerComponent.append(buildHeaderDropdownHtml())[0];

  dropdown.setStyle({
    ...dropdown.getStyle(),
    display: nextVisible ? "block" : "none",
  });
  configureHeaderMenuComponents(editor);
  setCanvasHeaderMenuExpanded(editor, nextVisible);

  if (nextVisible) {
    editor.select(dropdown, { scroll: false });
  }
}

function installCanvasHeaderRuntime(editor: Editor, headerState: SnapshotHeaderState) {
  const canvasWindow = editor.Canvas.getWindow();
  const canvasDocument = editor.Canvas.getDocument();
  let frameId = 0;
  let lastState: boolean | null = null;

  if (!canvasWindow || !canvasDocument) {
    return () => {};
  }

  const updateHeader = () => {
    frameId = 0;
    const nextState = canvasWindow.scrollY > 50;

    if (lastState === nextState) {
      return;
    }

    lastState = nextState;
    applyHeaderTone(canvasDocument, nextState, headerState);
  };

  const handleScroll = () => {
    if (frameId !== 0) {
      return;
    }

    frameId = canvasWindow.requestAnimationFrame(updateHeader);
  };

  updateHeader();
  const handleMenuClick = (event: MouseEvent) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const button = target.closest("header.fixed .header-desktop-toggle");

    if (!button) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    toggleCanvasHeaderMenu(editor);
  };

  canvasDocument.addEventListener("click", handleMenuClick);
  canvasWindow.addEventListener("scroll", handleScroll, { passive: true });

  return () => {
    if (frameId !== 0) {
      canvasWindow.cancelAnimationFrame(frameId);
    }

    canvasDocument.removeEventListener("click", handleMenuClick);
    canvasWindow.removeEventListener("scroll", handleScroll);
  };
}

function getComponentAttribute(component: Component, attributeName: string) {
  const value = component.getAttributes()[attributeName];

  return typeof value === "string" ? value : "";
}

function getProgramDayId(value: unknown): ProgramDayId {
  return value === "day-2" ? "day-2" : "day-1";
}

function getComponentViewElement(component: Component) {
  return component.getView()?.el instanceof HTMLElement ? component.getView()?.el : null;
}

function getEditorComponents(editor: Editor) {
  const wrapper = editor.getWrapper();

  return wrapper ? [wrapper, ...wrapper.find("*")] : [];
}

function getComponentForElement(editor: Editor, element: Element) {
  return getEditorComponents(editor).find((component) => getComponentViewElement(component) === element);
}

const textBlockTags = new Set([
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "LI",
  "BLOCKQUOTE",
  "FIGCAPTION",
  "TD",
  "TH",
  "BUTTON",
  "LABEL",
  "ADDRESS",
  "PRE",
  "DT",
  "DD",
  "LEGEND",
  "SUMMARY",
]);

const textInlineTags = new Set([
  "SPAN",
  "A",
  "STRONG",
  "EM",
  "B",
  "I",
  "U",
  "SMALL",
  "CITE",
  "TIME",
  "Q",
  "ABBR",
  "MARK",
  "CODE",
]);

function isImageComponent(component: Component) {
  return component.get("type") === "image" || component.get("tagName") === "img";
}

function isBlockingTextElement(element: HTMLElement) {
  if (!textBlockTags.has(element.tagName) && !textInlineTags.has(element.tagName)) {
    return false;
  }

  return (element.textContent ?? "").trim().length > 0;
}

function getImageElementFromContextTarget(target: HTMLElement, clientX?: number, clientY?: number) {
  if (target instanceof HTMLImageElement) {
    return target;
  }

  const closestImage = target.closest("img");

  if (closestImage instanceof HTMLImageElement) {
    return closestImage;
  }

  if (target.tagName === "PICTURE" || target.tagName === "FIGURE") {
    const image = target.querySelector("img");

    if (image instanceof HTMLImageElement) {
      return image;
    }
  }

  if (typeof clientX === "number" && typeof clientY === "number") {
    const stack = target.ownerDocument.elementsFromPoint(clientX, clientY);

    for (const element of stack) {
      if (element instanceof HTMLImageElement) {
        return element;
      }

      if (element instanceof HTMLElement && isBlockingTextElement(element)) {
        return null;
      }
    }
  }

  return null;
}

function findComponentByElement(editor: Editor, element: Element) {
  return getEditorComponents(editor).find((component) => {
    const viewElement = getComponentViewElement(component);
    const domElement = component.getEl();

    return viewElement === element || domElement === element;
  });
}

function getImageComponentFromElement(editor: Editor, imageElement: HTMLImageElement) {
  const wrapper = editor.getWrapper();
  const matchedImage = wrapper
    ?.find("img")
    .find((component) => (component.getEl() ?? getComponentViewElement(component)) === imageElement);

  if (matchedImage) {
    return matchedImage;
  }

  const exact = findComponentByElement(editor, imageElement);

  if (exact) {
    return exact;
  }

  let current: HTMLElement | null = imageElement.parentElement;

  while (current && current !== imageElement.ownerDocument.body) {
    const parent = findComponentByElement(editor, current);

    if (parent) {
      const nestedImage = parent.find("*").find((child) => {
        const childElement = child.getEl() ?? getComponentViewElement(child);

        return childElement === imageElement || (isImageComponent(child) && childElement?.contains(imageElement));
      });

      if (nestedImage) {
        return nestedImage;
      }

      return parent;
    }

    current = current.parentElement;
  }

  return undefined;
}

function getImageComponentFromContextTarget(
  editor: Editor,
  target: HTMLElement,
  event?: MouseEvent,
) {
  const imageElement = getImageElementFromContextTarget(target, event?.clientX, event?.clientY);

  return imageElement ? getImageComponentFromElement(editor, imageElement) : undefined;
}

const imageResizableOptions = {
  tl: true,
  tr: true,
  bl: true,
  br: true,
  tc: false,
  bc: false,
  cl: true,
  cr: true,
  keyWidth: "width",
  keyHeight: "height",
  ratioDefault: true,
};

function persistImageSize(imageComponent: Component, widthPx: number, heightPx: number) {
  const width = Math.max(24, Math.round(widthPx));
  const height = Math.max(24, Math.round(heightPx));

  imageComponent.addStyle({
    width: `${width}px`,
    height: `${height}px`,
    "max-width": "none",
  });
  imageComponent.addAttributes({
    width: String(width),
    height: String(height),
  });
}

function applyClickedImageSize(
  imageComponent: Component,
  element: HTMLElement,
  widthPx: number,
  heightPx: number,
) {
  const width = Math.max(24, Math.round(widthPx));
  const height = Math.max(24, Math.round(heightPx));

  element.style.width = `${width}px`;
  element.style.height = `${height}px`;
  element.style.maxWidth = "none";

  if (element instanceof HTMLImageElement) {
    element.setAttribute("width", String(width));
    element.setAttribute("height", String(height));
  }

  const componentElement = imageComponent.getEl() ?? getComponentViewElement(imageComponent);

  if (isImageComponent(imageComponent) || componentElement === element) {
    persistImageSize(imageComponent, width, height);
  }
}

type ActiveImageEdit = {
  editor: Editor;
  component: Component;
  image: HTMLImageElement;
};

type ActiveImagePan = {
  image: HTMLImageElement;
  component: Component;
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  mode: "object-position" | "translate";
};

let activeImageEdit: ActiveImageEdit | null = null;
let activeImagePan: ActiveImagePan | null = null;

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isResizerHandle(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(".gjs-resizer-h, .gjs-resizer"));
}

function parsePositionPercent(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  if (value === "left" || value === "top") {
    return 0;
  }

  if (value === "right" || value === "bottom") {
    return 100;
  }

  if (value === "center") {
    return 50;
  }

  const numeric = Number.parseFloat(value);

  return Number.isFinite(numeric) ? numeric : fallback;
}

function getImageObjectPosition(image: HTMLImageElement) {
  const position = (image.style.objectPosition || image.ownerDocument.defaultView?.getComputedStyle(image).objectPosition || "50% 50%")
    .trim()
    .split(/\s+/);

  return {
    x: parsePositionPercent(position[0], 50),
    y: parsePositionPercent(position[1] ?? position[0], 50),
  };
}

function getImageTranslate(image: HTMLImageElement) {
  const inline = /translate3?d?\(([-\d.]+)px,\s*([-\d.]+)px/i.exec(image.style.transform);

  if (inline) {
    return { x: Number(inline[1]), y: Number(inline[2]) };
  }

  const computed = image.ownerDocument.defaultView?.getComputedStyle(image).transform;

  if (computed && computed !== "none") {
    const matrix = new DOMMatrix(computed);

    return { x: matrix.m41, y: matrix.m42 };
  }

  return { x: 0, y: 0 };
}

function usesObjectPositionPan(image: HTMLImageElement) {
  const objectFit = image.ownerDocument.defaultView?.getComputedStyle(image).objectFit ?? "";

  return objectFit === "cover" || objectFit === "contain";
}

function persistImageObjectPosition(
  imageComponent: Component,
  image: HTMLImageElement,
  x: number,
  y: number,
) {
  const nextX = clampNumber(x, 0, 100);
  const nextY = clampNumber(y, 0, 100);
  const value = `${Number(nextX.toFixed(1))}% ${Number(nextY.toFixed(1))}%`;

  image.style.objectPosition = value;

  if (isImageComponent(imageComponent) || imageComponent.getEl() === image) {
    imageComponent.addStyle({ "object-position": value });
  }

  return { x: nextX, y: nextY };
}

function persistImageTranslate(
  imageComponent: Component,
  image: HTMLImageElement,
  x: number,
  y: number,
) {
  const container = image.parentElement;
  const imageWidth = image.offsetWidth;
  const imageHeight = image.offsetHeight;
  const containerWidth = container?.clientWidth ?? imageWidth;
  const containerHeight = container?.clientHeight ?? imageHeight;
  const minX = imageWidth >= containerWidth ? containerWidth - imageWidth : 0;
  const maxX = imageWidth >= containerWidth ? 0 : containerWidth - imageWidth;
  const minY = imageHeight >= containerHeight ? containerHeight - imageHeight : 0;
  const maxY = imageHeight >= containerHeight ? 0 : containerHeight - imageHeight;
  const nextX = clampNumber(x, minX, maxX);
  const nextY = clampNumber(y, minY, maxY);
  const value = `translate(${Math.round(nextX)}px, ${Math.round(nextY)}px)`;

  image.style.transform = value;

  if (isImageComponent(imageComponent) || imageComponent.getEl() === image) {
    imageComponent.addStyle({ transform: value });
  }

  return { x: nextX, y: nextY };
}

function prepareImageMoveContainer(image: HTMLImageElement) {
  const container = image.parentElement;

  if (!container) {
    return;
  }

  const style = image.ownerDocument.defaultView?.getComputedStyle(container);

  if (style?.overflow === "visible") {
    container.style.overflow = "hidden";
  }

  if (style?.position === "static") {
    container.style.position = "relative";
  }
}

function deactivateImageEditMode() {
  if (activeImagePan) {
    try {
      activeImagePan.image.releasePointerCapture(activeImagePan.pointerId);
    } catch {
      // The pointer may already have been released.
    }

    activeImagePan.image.style.cursor = "grab";
    activeImagePan = null;
  }

  if (activeImageEdit) {
    activeImageEdit.image.style.cursor = "";
    activeImageEdit.image.removeAttribute("data-cbdas-image-move");
    activeImageEdit = null;
  }
}

function activateImageEditMode(
  editor: Editor,
  imageComponent: Component,
  image: HTMLImageElement,
) {
  deactivateImageEditMode();
  image.setAttribute("draggable", "false");
  image.setAttribute("data-cbdas-image-move", "true");
  image.style.cursor = "grab";
  prepareImageMoveContainer(image);
  imageComponent.set({
    draggable: false,
    selectable: true,
    hoverable: true,
  });
  activeImageEdit = {
    editor,
    component: imageComponent,
    image,
  };
}

function beginImagePan(event: PointerEvent, imageComponent: Component, image: HTMLImageElement) {
  const mode = usesObjectPositionPan(image) ? "object-position" : "translate";
  const origin = mode === "object-position" ? getImageObjectPosition(image) : getImageTranslate(image);

  if (mode === "translate") {
    prepareImageMoveContainer(image);
  }

  image.style.cursor = "grabbing";
  image.setPointerCapture(event.pointerId);
  activeImagePan = {
    image,
    component: imageComponent,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    originX: origin.x,
    originY: origin.y,
    mode,
  };
}

function moveActiveImagePan(event: PointerEvent) {
  if (!activeImagePan || event.pointerId !== activeImagePan.pointerId) {
    return;
  }

  const deltaX = event.clientX - activeImagePan.startX;
  const deltaY = event.clientY - activeImagePan.startY;

  if (activeImagePan.mode === "object-position") {
    const width = Math.max(activeImagePan.image.clientWidth, 1);
    const height = Math.max(activeImagePan.image.clientHeight, 1);

    persistImageObjectPosition(
      activeImagePan.component,
      activeImagePan.image,
      activeImagePan.originX - (deltaX / width) * 100,
      activeImagePan.originY - (deltaY / height) * 100,
    );
    return;
  }

  persistImageTranslate(
    activeImagePan.component,
    activeImagePan.image,
    activeImagePan.originX + deltaX,
    activeImagePan.originY + deltaY,
  );
}

function endActiveImagePan(event: PointerEvent) {
  if (!activeImagePan || event.pointerId !== activeImagePan.pointerId) {
    return;
  }

  const { component, image, mode } = activeImagePan;

  try {
    image.releasePointerCapture(event.pointerId);
  } catch {
    // The pointer may already have been released.
  }

  image.style.cursor = "grab";
  activeImagePan = null;

  const panelist = component.closest(panelistCardSelector);

  if (panelist && mode === "object-position" && panelist.getAttributes()["data-speaker-card"] !== undefined) {
    const position = getImageObjectPosition(image);

    panelist.set({
      panelistObjectX: `${Number(position.x.toFixed(1))}%`,
      panelistObjectY: `${Number(position.y.toFixed(1))}%`,
    });
  }
}

function beginImageResize(
  editor: Editor,
  imageComponent: Component,
  clickedImage?: HTMLImageElement | null,
) {
  const viewElement = imageComponent.getEl() ?? getComponentViewElement(imageComponent);
  const imageElement =
    clickedImage ??
    (viewElement instanceof HTMLImageElement
      ? viewElement
      : viewElement?.querySelector("img") ?? null);

  if (isImageComponent(imageComponent)) {
    imageComponent.set({
      resizable: imageResizableOptions,
      selectable: true,
      hoverable: true,
    });
    editor.select(imageComponent);
  }

  if (imageElement instanceof HTMLImageElement) {
    const rect = imageElement.getBoundingClientRect();

    if (rect.width > 0 && rect.height > 0) {
      applyClickedImageSize(imageComponent, imageElement, rect.width, rect.height);
    }
  }

  if (editor.Commands.isActive("resize")) {
    editor.stopCommand("resize");
  }

  editor.runCommand("resize", {
    component: imageComponent,
    el: imageElement ?? viewElement ?? undefined,
    force: true,
    ...imageResizableOptions,
    updateTarget: (element, rect) => {
      applyClickedImageSize(imageComponent, element, rect.w, rect.h);
    },
  });

  if (imageElement instanceof HTMLImageElement) {
    activateImageEditMode(editor, imageComponent, imageElement);
  }
}

function configureResizableImages(editor: Editor) {
  for (const component of getEditorComponents(editor)) {
    if (isImageComponent(component)) {
      component.set({
        resizable: imageResizableOptions,
        selectable: true,
        hoverable: true,
      });
    }
  }
}

function registerImageResizeEditing(editor: Editor) {
  editor.on("canvas:load", () => configureResizableImages(editor));
  editor.on("component:add", (component: Component) => {
    if (isImageComponent(component)) {
      component.set({
        resizable: imageResizableOptions,
        selectable: true,
        hoverable: true,
      });
    }
  });
  editor.on("component:resize", () => {
    const selected = editor.getSelected();

    if (!selected || !isImageComponent(selected)) {
      return;
    }

    const style = selected.getStyle();
    const width = Number.parseFloat(String(style.width ?? ""));
    const height = Number.parseFloat(String(style.height ?? ""));

    if (Number.isFinite(width) && Number.isFinite(height)) {
      persistImageSize(selected, width, height);
    }
  });
}

function isTextLikeElement(element: HTMLElement) {
  if (textBlockTags.has(element.tagName) || textInlineTags.has(element.tagName)) {
    return true;
  }

  return (
    (element.tagName === "DIV" || element.tagName === "SECTION") &&
    element.childElementCount === 0 &&
    (element.textContent ?? "").trim().length > 0
  );
}

function isTextComponent(component: Component) {
  const type = String(component.get("type") ?? "");
  const tagName = String(component.get("tagName") ?? "").toUpperCase();

  return (
    type === "text" ||
    type === "textnode" ||
    type === "link" ||
    textBlockTags.has(tagName) ||
    textInlineTags.has(tagName)
  );
}

function getTextElementFromTarget(target: HTMLElement) {
  const canvasBody = target.ownerDocument.body;
  let current: HTMLElement | null = target;
  let inlineMatch: HTMLElement | null = null;

  while (current && current !== canvasBody) {
    if (current instanceof HTMLImageElement || current.tagName === "SVG") {
      return null;
    }

    if (textBlockTags.has(current.tagName)) {
      return current;
    }

    if (!inlineMatch && isTextLikeElement(current)) {
      inlineMatch = current;
    }

    current = current.parentElement;
  }

  return inlineMatch;
}

function getTextComponentFromTarget(editor: Editor, target: HTMLElement) {
  const textElement = getTextElementFromTarget(target);

  if (!textElement) {
    return null;
  }

  let current: HTMLElement | null = textElement;

  while (current && current !== target.ownerDocument.body) {
    const component = getComponentForElement(editor, current);

    if (component && !isImageComponent(component)) {
      return component;
    }

    current = current.parentElement;
  }

  return null;
}

function beginTextEdit(editor: Editor, textComponent: Component, event?: Event) {
  textComponent.set({
    editable: true,
    selectable: true,
    hoverable: true,
  });
  editor.select(textComponent);
  textComponent.getView()?.onActive(event);
}

function configureEditableText(editor: Editor) {
  for (const component of getEditorComponents(editor)) {
    if (isTextComponent(component)) {
      component.set({ editable: true });
    }
  }
}

function registerTextEditing(editor: Editor) {
  editor.on("canvas:load", () => configureEditableText(editor));
  editor.on("component:add", (component: Component) => {
    if (isTextComponent(component)) {
      component.set({ editable: true });
    }
  });
}

function isLikelyImageFile(file: File) {
  if (file.type.startsWith("image/")) {
    return true;
  }

  return /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(file.name);
}

function findClosestSpeakerCardComponent(component: Component | undefined) {
  let currentComponent = component;

  while (currentComponent) {
    if (currentComponent.getAttributes()["data-cbdas-speaker-card"] !== undefined) {
      return currentComponent;
    }

    currentComponent = currentComponent.parent();
  }

  return undefined;
}

function setImageComponentSrc(editor: Editor, imageComponent: Component, src: string) {
  imageComponent.addAttributes({ src });
  imageComponent.set("src", src);

  const viewElement = getComponentViewElement(imageComponent);

  if (viewElement instanceof HTMLImageElement) {
    viewElement.src = src;
  } else if (viewElement) {
    const nestedImage = viewElement.querySelector("img");

    if (nestedImage instanceof HTMLImageElement) {
      nestedImage.src = src;
      nestedImage.setAttribute("src", src);
    }
  }

  const panelistComponent = imageComponent.closest(panelistCardSelector);

  if (panelistComponent) {
    panelistComponent.set("panelistImage", src);
    syncPanelistCardComponent(panelistComponent);
  }

  const speakerCard = findClosestSpeakerCardComponent(imageComponent);

  if (speakerCard) {
    const speakerImage =
      speakerCard.find("img")[0] ??
      (imageComponent.get("tagName") === "img" ? imageComponent : undefined);

    if (speakerImage) {
      speakerImage.addAttributes({ src });
      speakerImage.set("src", src);
      const speakerImageEl = getComponentViewElement(speakerImage);

      if (speakerImageEl instanceof HTMLImageElement) {
        speakerImageEl.src = src;
      }
    }
  }

  editor.select(imageComponent);
  editor.trigger("component:update", imageComponent);
  editor.refresh();
}

function findScheduleComponents(editor: Editor) {
  const wrapper = editor.getWrapper();

  if (!wrapper) {
    return [];
  }

  const schedules = wrapper.findType((component) => {
    const attributes = component.getAttributes();

    return attributes.id === "programacao" || attributes["data-cbdas-programacao"] !== undefined;
  });

  return schedules.length > 0 ? schedules : wrapper.find("#programacao");
}

function findScheduleForElement(editor: Editor, scheduleElement: HTMLElement) {
  return findScheduleComponents(editor).find(
    (component) => getComponentViewElement(component) === scheduleElement,
  );
}

function findClosestScheduleComponent(component: Component | undefined) {
  let currentComponent = component;

  while (currentComponent) {
    if (currentComponent.getAttributes()["data-cbdas-programacao"] !== undefined) {
      return currentComponent;
    }

    currentComponent = currentComponent.parent();
  }

  return undefined;
}

function findClosestProgramCardComponent(component: Component | undefined) {
  let currentComponent = component;

  while (currentComponent) {
    if (currentComponent.getAttributes()["data-program-card"] !== undefined) {
      return currentComponent;
    }

    currentComponent = currentComponent.parent();
  }

  return undefined;
}

function setVisibleProgramDayInCanvas(schedule: Component, activeDay: ProgramDayId) {
  const root = getComponentViewElement(schedule);

  if (!root) {
    return;
  }

  setVisibleProgramDayElement(root, activeDay);
}

function setVisibleProgramDayElement(root: HTMLElement, activeDay: ProgramDayId) {
  root.querySelectorAll<HTMLElement>("[data-program-day]").forEach((element) => {
    const isActive = element.dataset.programDay === activeDay;

    element.hidden = !isActive;
    element.classList.toggle("is-editor-visible", isActive);
  });

  root.querySelectorAll<HTMLElement>("[data-program-tab]").forEach((element) => {
    const isActive = element.dataset.programTab === activeDay;

    element.classList.toggle("is-active", isActive);
    element.setAttribute("aria-selected", String(isActive));
    element.classList.toggle("bg-idasan-blue", isActive);
    element.classList.toggle("text-white", isActive);
    element.classList.toggle("shadow-md", isActive);
    element.classList.toggle("text-gray-500", !isActive);
  });
}

function getProgramDayComponent(schedule: Component, dayId: ProgramDayId) {
  return schedule.find(`[data-program-day="${dayId}"]`)[0];
}

function selectEditorProgramDay(editor: Editor, schedule: Component, dayId: ProgramDayId) {
  setVisibleProgramDayInCanvas(schedule, dayId);

  const dayComponent = getProgramDayComponent(schedule, dayId);

  if (!dayComponent) {
    return;
  }

  editor.runCommand("core:open-layers");
  editor.Layers.setOpen(schedule, true);
  editor.Layers.setOpen(dayComponent, true);
  editor.select(dayComponent, { scroll: true });
}

function configureProgramScheduleComponents(editor: Editor) {
  findScheduleComponents(editor).forEach((schedule) => {
    schedule.set({
      name: "Programação completa",
      selectable: true,
      hoverable: true,
      layerable: true,
      droppable: false,
      editorVisibleDay: getProgramDayId(schedule.get("editorVisibleDay")),
      toolbar: [
        {
          attributes: {
            class: "fa fa-calendar-day",
            title: "Visualizar Dia 1",
          },
          command: "cbdas-show-program-day-1",
        },
        {
          attributes: {
            class: "fa fa-calendar",
            title: "Visualizar Dia 2",
          },
          command: "cbdas-show-program-day-2",
        },
      ],
    });

    const tabsComponent = schedule.find("[data-program-tabs]")[0];
    tabsComponent?.set({
      name: "Seletor de dias",
      layerable: true,
      selectable: true,
      droppable: false,
      draggable: false,
      copyable: false,
      removable: false,
    });

    programDayIds.forEach((dayId) => {
      const tabComponent = schedule.find(`[data-program-tab="${dayId}"]`)[0];
      tabComponent?.set({
        name: `Aba ${dayId === "day-1" ? "Dia 1" : "Dia 2"}`,
        editable: false,
        droppable: false,
        draggable: false,
        copyable: false,
        removable: false,
        selectable: true,
      });
      tabComponent?.find("*").forEach((child) => {
        child.set({
          editable: false,
          droppable: false,
          draggable: false,
          copyable: false,
          removable: false,
          selectable: false,
          layerable: false,
        });
      });

      const dayComponent = getProgramDayComponent(schedule, dayId);
      dayComponent?.set({
        name: `Programação — ${dayId === "day-1" ? "Dia 1" : "Dia 2"}`,
        layerable: true,
        selectable: true,
      });

      dayComponent?.find("[data-program-card]").forEach((card) => {
        const cardTitle =
          getComponentAttribute(card, "data-program-card-title") ||
          getComponentViewElement(card)?.querySelector("h3")?.textContent?.trim() ||
          "Atividade";

        card.set({
          name: cardTitle,
          layerable: true,
          selectable: true,
          hoverable: true,
        });
      });
    });

    setVisibleProgramDayInCanvas(schedule, "day-1");
  });
}

function registerProgramScheduleEditing(editor: Editor) {
  let isPreviewMode = false;
  const installCanvasClickHandler = () => {
    const canvasDocument = editor.Canvas.getDocument();
    const canvasWindow = editor.Canvas.getWindow();

    if (!canvasDocument || !canvasWindow || canvasDocument.body.dataset.cbdasProgramTabsHandler) {
      return;
    }

    canvasDocument.body.dataset.cbdasProgramTabsHandler = "true";

    canvasDocument.addEventListener(
      "click",
      (event) => {
        const target = event.target as Element | null;

        if (!target || typeof target.closest !== "function") {
          return;
        }

        const tab = target.closest<HTMLElement>("[data-program-tab]");
        const scheduleElement = target.closest<HTMLElement>("[data-cbdas-programacao]");

        if (!tab || !scheduleElement) {
          return;
        }

        const schedule = findScheduleForElement(editor, scheduleElement) ?? findScheduleComponents(editor)[0];
        const dayId = getProgramDayId(tab.dataset.programTab);

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        setVisibleProgramDayElement(scheduleElement, dayId);

        if (!schedule) {
          return;
        }

        if (isPreviewMode) {
          return;
        }

        schedule.set("editorVisibleDay", dayId);
        selectEditorProgramDay(editor, schedule, dayId);
      },
      true,
    );
  };

  editor.DomComponents.addType("cbdas-programacao", {
    isComponent: (element: unknown) =>
      Boolean(
        element &&
          typeof (element as Element).hasAttribute === "function" &&
          (element as Element).hasAttribute("data-cbdas-programacao"),
      ),
    model: {
      defaults: {
        name: "Programação completa",
        selectable: true,
        hoverable: true,
        layerable: true,
        droppable: false,
        editorVisibleDay: "day-1",
        traits: [
          {
            type: "select",
            name: "editorVisibleDay",
            label: "Dia visível no editor",
            changeProp: true,
            options: [
              { id: "day-1", name: programDayLabels["day-1"] },
              { id: "day-2", name: programDayLabels["day-2"] },
            ],
          },
        ],
      },
    },
  });

  editor.Commands.add("cbdas-show-program-day-1", {
    run: (currentEditor) => {
      const schedule = findClosestScheduleComponent(currentEditor.getSelected()) ??
        findScheduleComponents(currentEditor)[0];

      if (schedule) {
        selectEditorProgramDay(currentEditor, schedule, "day-1");
      }
    },
  });

  editor.Commands.add("cbdas-show-program-day-2", {
    run: (currentEditor) => {
      const schedule = findClosestScheduleComponent(currentEditor.getSelected()) ??
        findScheduleComponents(currentEditor)[0];

      if (schedule) {
        selectEditorProgramDay(currentEditor, schedule, "day-2");
      }
    },
  });

  editor.Commands.add("cbdas-select-program-card", {
    run: (currentEditor) => {
      const card = findClosestProgramCardComponent(currentEditor.getSelected());

      if (card) {
        currentEditor.select(card, { scroll: true });
      }
    },
  });

  editor.on("component:update:editorVisibleDay", (component: Component) => {
    const schedule = findClosestScheduleComponent(component);

    if (schedule) {
      selectEditorProgramDay(editor, schedule, getProgramDayId(component.get("editorVisibleDay")));
    }
  });

  editor.on("component:selected", (component: Component) => {
    const card = findClosestProgramCardComponent(component);

    if (!card || card === component) {
      return;
    }

    const toolbar = component.get("toolbar") ?? [];
    const hasSelectCardButton = toolbar.some(
      (item) => item.command === "cbdas-select-program-card",
    );

    if (!hasSelectCardButton) {
      component.set("toolbar", [
        ...toolbar,
        {
          attributes: {
            class: "fa fa-level-up",
            title: "Selecionar atividade",
          },
          command: "cbdas-select-program-card",
        },
      ]);
    }
  });

  editor.on("run:preview", () => {
    isPreviewMode = true;
  });

  editor.on("stop:preview", () => {
    isPreviewMode = false;
    findScheduleComponents(editor).forEach((schedule) => {
      setVisibleProgramDayInCanvas(
        schedule,
        getProgramDayId(schedule.get("editorVisibleDay")),
      );
    });
  });

  editor.on("canvas:load", () => {
    installCanvasClickHandler();
  });

  window.setTimeout(installCanvasClickHandler, 0);
}

function registerSpeakerCardEditing(editor: Editor) {
  editor.DomComponents.addType("cbdas-speakers-list", {
    isComponent: (element: unknown) =>
      Boolean(
        element &&
          typeof (element as Element).hasAttribute === "function" &&
          (element as Element).hasAttribute("data-cbdas-speakers-list"),
      ),
    model: {
      defaults: {
        name: "Lista de palestrantes",
        selectable: true,
        hoverable: true,
        layerable: true,
        draggable: false,
        droppable: speakerCardSelector,
      },
    },
  });

  editor.DomComponents.addType("cbdas-speaker-card", {
    isComponent: (element: unknown) =>
      Boolean(
        element &&
          typeof (element as Element).hasAttribute === "function" &&
          (element as Element).hasAttribute("data-cbdas-speaker-card"),
      ),
    model: {
      defaults: {
        name: "Palestrante",
        selectable: true,
        hoverable: true,
        layerable: true,
        draggable: speakerListSelector,
        droppable: false,
        dmode: "",
      },
    },
  });

  editor.on("component:add", (component: Component) => {
    const attributes = component.getAttributes();

    if (
      attributes["data-cbdas-speaker-card"] !== undefined ||
      attributes["data-cbdas-speakers-list"] !== undefined
    ) {
      window.setTimeout(() => configureSpeakerComponents(editor), 0);
    }
  });
}

function getSpeakerLists(editor: Editor) {
  return editor.getWrapper()?.find(speakerListSelector) ?? [];
}

function getSpeakerCards(editor: Editor) {
  return editor.getWrapper()?.find(speakerCardSelector) ?? [];
}

function configureSpeakerComponents(editor: Editor) {
  getSpeakerLists(editor).forEach((speakerList) => {
    speakerList.set({
      name: "Lista de palestrantes",
      selectable: true,
      hoverable: true,
      layerable: true,
      draggable: false,
      droppable: speakerCardSelector,
    });
  });

  getSpeakerCards(editor).forEach((speakerCard) => {
    const name =
      getComponentViewElement(speakerCard)?.querySelector("h3")?.textContent?.trim() ||
      "Palestrante";

    speakerCard.set({
      name,
      selectable: true,
      hoverable: true,
      layerable: true,
      draggable: speakerListSelector,
      droppable: false,
      dmode: "",
    });

    speakerCard.find("*").forEach((child) => {
      child.set({
        draggable: false,
        droppable: false,
      });
    });
  });
}

function getPanelistCardValue(component: Component, propertyName: string, fallback: string) {
  const value = component.get(propertyName);

  return typeof value === "string" && value.trim() ? value : fallback;
}

function getPanelistCardClassValue(component: Component, values: string[], fallback: string) {
  const classes = new Set(component.getClasses() as string[]);

  return values.find((value) => classes.has(value)) ?? fallback;
}

function setPanelistCardClassValue(component: Component, values: string[], value: string) {
  component.removeClass(values);

  if (value && !value.endsWith("-custom")) {
    component.addClass(value);
  }
}

function setPanelistCardText(component: Component, selector: string, value: string) {
  const textComponent = component.find(selector)[0];

  if (!textComponent) {
    return;
  }

  textComponent.components(value);
}

function getPanelistCardImage(component: Component) {
  return component.find(".speaker-card__photo")[0];
}

function configurePanelistChildComponents(component: Component) {
  component.find(".speaker-card__photo-wrapper").forEach((photoWrapper) => {
    photoWrapper.set({
      name: "Foto",
      selectable: true,
      hoverable: true,
      layerable: true,
      draggable: panelistCardSelector,
      droppable: ".speaker-card__photo",
      dmode: "translate",
    });
  });

  component.find(".speaker-card__photo").forEach((photo) => {
    photo.set({
      name: "Imagem do painelista",
      selectable: true,
      hoverable: true,
      layerable: true,
      draggable: ".speaker-card__photo-wrapper",
      droppable: false,
      dmode: "translate",
      toolbar: [
        {
          attributes: { class: "fa fa-arrows", title: "Mover" },
          command: "tlb-move",
        },
        {
          attributes: { class: "fa fa-image", title: "Editar imagem" },
          command: "cbdas-panelist-edit-image",
        },
        {
          attributes: { class: "fa fa-level-up", title: "Selecionar painelista" },
          command: "core:component-exit",
        },
      ],
    });
  });

  component.find(".speaker-card__content").forEach((content) => {
    content.set({
      name: "Informacoes",
      selectable: true,
      hoverable: true,
      layerable: true,
      draggable: panelistCardSelector,
      droppable: ".speaker-card__name, .speaker-card__role",
      dmode: "translate",
    });
  });

  component.find(".speaker-card__name").forEach((name) => {
    name.set({
      name: "Nome do painelista",
      selectable: true,
      hoverable: true,
      layerable: true,
      editable: true,
      draggable: ".speaker-card__content",
      droppable: false,
      dmode: "translate",
    });
  });

  component.find(".speaker-card__role").forEach((role) => {
    role.set({
      name: "Cargo ou instituicao",
      selectable: true,
      hoverable: true,
      layerable: true,
      editable: true,
      draggable: ".speaker-card__content",
      droppable: false,
      dmode: "translate",
    });
  });
}

function syncPanelistCardComponent(component: Component) {
  const name = getPanelistCardValue(component, "panelistName", panelistDefaultName);
  const role = getPanelistCardValue(component, "panelistRole", panelistDefaultRole);
  const imageSrc = getPanelistCardValue(component, "panelistImage", panelistDefaultImageSrc);
  const imageAlt = getPanelistCardValue(component, "panelistAlt", name);
  const objectX = getPanelistCardValue(component, "panelistObjectX", "center");
  const objectY = getPanelistCardValue(component, "panelistObjectY", "center");
  const componentSize = getPanelistCardValue(component, "panelistSize", "speaker-card--medium");
  const alignment = getPanelistCardValue(component, "panelistAlignment", "speaker-card--align-left");
  const imagePosition = getPanelistCardValue(
    component,
    "panelistImagePosition",
    "speaker-card--image-left",
  );
  const widthMode = getPanelistCardValue(component, "panelistWidth", "speaker-card--width-auto");

  component.addAttributes({
    "data-gjs-type": "speaker-card",
    "data-speaker-card": "true",
  });
  component.addClass("speaker-card");
  setPanelistCardClassValue(component, panelistSizeClasses, componentSize);
  setPanelistCardClassValue(component, panelistAlignmentClasses, alignment);
  setPanelistCardClassValue(component, panelistImagePositionClasses, imagePosition);
  setPanelistCardClassValue(component, panelistWidthClasses, widthMode);
  setPanelistCardText(component, ".speaker-card__name", name);
  setPanelistCardText(component, ".speaker-card__role", role);

  const imageComponent = getPanelistCardImage(component);

  if (imageComponent) {
    imageComponent.addAttributes({
      src: imageSrc,
      alt: imageAlt,
    });
    imageComponent.setStyle({
      ...imageComponent.getStyle(),
      "object-position": `${objectX} ${objectY}`,
    });
  }
}

function hydratePanelistCardComponent(component: Component) {
  const element = getComponentViewElement(component);
  const image = element?.querySelector<HTMLImageElement>(".speaker-card__photo");
  const name =
    element?.querySelector<HTMLElement>(".speaker-card__name")?.textContent?.trim() ||
    panelistDefaultName;
  const role =
    element?.querySelector<HTMLElement>(".speaker-card__role")?.textContent?.trim() ||
    panelistDefaultRole;
  const style = image?.style.objectPosition.trim().split(/\s+/) ?? [];
  const objectX = style[0] || "center";
  const objectY = style[1] || "center";

  component.set({
    name: "Adicionar Painelista",
    selectable: true,
    hoverable: true,
    copyable: true,
    removable: true,
    layerable: true,
    draggable: true,
    droppable: ".speaker-card__photo-wrapper, .speaker-card__content",
    dmode: "",
    panelistName: getPanelistCardValue(component, "panelistName", name),
    panelistRole: getPanelistCardValue(component, "panelistRole", role),
    panelistImage: getPanelistCardValue(
      component,
      "panelistImage",
      image?.getAttribute("src") || panelistDefaultImageSrc,
    ),
    panelistAlt: getPanelistCardValue(
      component,
      "panelistAlt",
      image?.getAttribute("alt") || name,
    ),
    panelistObjectX: getPanelistCardValue(component, "panelistObjectX", objectX),
    panelistObjectY: getPanelistCardValue(component, "panelistObjectY", objectY),
    panelistSize: getPanelistCardValue(
      component,
      "panelistSize",
      getPanelistCardClassValue(component, panelistSizeClasses, "speaker-card--medium"),
    ),
    panelistAlignment: getPanelistCardValue(
      component,
      "panelistAlignment",
      getPanelistCardClassValue(component, panelistAlignmentClasses, "speaker-card--align-left"),
    ),
    panelistImagePosition: getPanelistCardValue(
      component,
      "panelistImagePosition",
      getPanelistCardClassValue(
        component,
        panelistImagePositionClasses,
        "speaker-card--image-left",
      ),
    ),
    panelistWidth: getPanelistCardValue(
      component,
      "panelistWidth",
      getPanelistCardClassValue(component, panelistWidthClasses, "speaker-card--width-auto"),
    ),
    resizable: {
      tl: true,
      tr: true,
      bl: true,
      br: true,
      tc: false,
      bc: false,
      cl: true,
      cr: true,
      keyWidth: "width",
      keyHeight: "height",
    },
    traits: [
      {
        type: "text",
        name: "panelistImage",
        label: "Imagem",
        changeProp: true,
      },
      {
        type: "text",
        name: "panelistAlt",
        label: "Texto alternativo",
        changeProp: true,
      },
      {
        type: "select",
        name: "panelistObjectX",
        label: "Posicao horizontal da imagem",
        changeProp: true,
        options: [
          { id: "left", label: "Esquerda" },
          { id: "center", label: "Centro" },
          { id: "right", label: "Direita" },
        ],
      },
      {
        type: "select",
        name: "panelistObjectY",
        label: "Posicao vertical da imagem",
        changeProp: true,
        options: [
          { id: "top", label: "Topo" },
          { id: "center", label: "Centro" },
          { id: "bottom", label: "Base" },
        ],
      },
      {
        type: "text",
        name: "panelistName",
        label: "Nome do painelista",
        changeProp: true,
      },
      {
        type: "text",
        name: "panelistRole",
        label: "Cargo ou instituicao",
        changeProp: true,
      },
      {
        type: "select",
        name: "panelistSize",
        label: "Tamanho do componente",
        changeProp: true,
        options: [
          { id: "speaker-card--small", label: "Pequeno" },
          { id: "speaker-card--medium", label: "Medio" },
          { id: "speaker-card--large", label: "Grande" },
          { id: "speaker-card--custom", label: "Personalizado" },
        ],
      },
      {
        type: "select",
        name: "panelistAlignment",
        label: "Alinhamento interno",
        changeProp: true,
        options: [
          { id: "speaker-card--align-left", label: "Esquerda" },
          { id: "speaker-card--align-center", label: "Centro" },
        ],
      },
      {
        type: "select",
        name: "panelistImagePosition",
        label: "Posicao da imagem",
        changeProp: true,
        options: [
          { id: "speaker-card--image-left", label: "Esquerda" },
          { id: "speaker-card--image-right", label: "Direita" },
        ],
      },
      {
        type: "select",
        name: "panelistWidth",
        label: "Largura",
        changeProp: true,
        options: [
          { id: "speaker-card--width-auto", label: "Automatica" },
          { id: "speaker-card--width-25", label: "25%" },
          { id: "speaker-card--width-50", label: "50%" },
          { id: "speaker-card--width-75", label: "75%" },
          { id: "speaker-card--width-100", label: "100%" },
          { id: "speaker-card--width-custom", label: "Personalizada" },
        ],
      },
    ],
    toolbar: [
      {
        attributes: { class: "fa fa-arrows", title: "Mover" },
        command: "tlb-move",
      },
      {
        attributes: { class: "fa fa-clone", title: "Duplicar" },
        command: "tlb-clone",
      },
      {
        attributes: { class: "fa fa-image", title: "Editar imagem" },
        command: "cbdas-panelist-edit-image",
      },
      {
        attributes: { class: "fa fa-level-up", title: "Selecionar componente pai" },
        command: "core:component-exit",
      },
      {
        attributes: { class: "fa fa-trash", title: "Excluir" },
        command: "tlb-delete",
      },
    ],
  } as Record<string, unknown>);

  syncPanelistCardComponent(component);

  configurePanelistChildComponents(component);
}

function getPanelistCards(editor: Editor) {
  return editor.getWrapper()?.find(panelistCardSelector) ?? [];
}

function configurePanelistComponents(editor: Editor) {
  getPanelistCards(editor).forEach((component) => hydratePanelistCardComponent(component));
}

function openPanelistImageAssetManager(editor: Editor, component: Component) {
  const imageComponent = getPanelistCardImage(component);

  if (!imageComponent) {
    return;
  }

  editor.AssetManager.open({
    types: ["image"],
    select: (asset: Asset, complete: boolean) => {
      const src = asset.getSrc();

      if (typeof src !== "string" || !src) {
        return;
      }

      component.set("panelistImage", src);
      imageComponent.addAttributes({ src });
      syncPanelistCardComponent(component);

      if (complete) {
        editor.AssetManager.close();
      }
    },
  });
}

function registerPanelistCardEditing(editor: Editor) {
  editor.DomComponents.addType("speaker-card", {
    isComponent: (element: unknown) =>
      Boolean(
        element &&
          typeof (element as Element).hasAttribute === "function" &&
          (element as Element).hasAttribute("data-speaker-card"),
      ),
    model: {
      defaults: {
        name: "Adicionar Painelista",
        tagName: "div",
        classes: ["speaker-card", "speaker-card--medium", "speaker-card--align-left"],
        attributes: {
          "data-gjs-type": "speaker-card",
          "data-speaker-card": "true",
        },
        draggable: true,
        droppable: ".speaker-card__photo-wrapper, .speaker-card__content",
        selectable: true,
        hoverable: true,
        copyable: true,
        removable: true,
        layerable: true,
        dmode: "",
        panelistImage: panelistDefaultImageSrc,
        panelistAlt: "",
        panelistObjectX: "center",
        panelistObjectY: "center",
        panelistName: panelistDefaultName,
        panelistRole: panelistDefaultRole,
        panelistSize: "speaker-card--medium",
        panelistAlignment: "speaker-card--align-left",
        panelistImagePosition: "speaker-card--image-left",
        panelistWidth: "speaker-card--width-auto",
        resizable: {
          tl: true,
          tr: true,
          bl: true,
          br: true,
          tc: false,
          bc: false,
          cl: true,
          cr: true,
          keyWidth: "width",
          keyHeight: "height",
        },
        components: [
          {
            type: "default",
            name: "Foto",
            classes: ["speaker-card__photo-wrapper"],
            selectable: true,
            hoverable: true,
            layerable: true,
            draggable: panelistCardSelector,
            droppable: ".speaker-card__photo",
            dmode: "translate",
            components: [
              {
                type: "image",
                name: "Imagem do painelista",
                classes: ["speaker-card__photo"],
                selectable: true,
                hoverable: true,
                layerable: true,
                draggable: ".speaker-card__photo-wrapper",
                droppable: false,
                dmode: "translate",
                attributes: {
                  src: panelistDefaultImageSrc,
                  alt: panelistDefaultName,
                },
              },
            ],
          },
          {
            type: "default",
            name: "Informacoes",
            classes: ["speaker-card__content"],
            selectable: true,
            hoverable: true,
            layerable: true,
            draggable: panelistCardSelector,
            droppable: ".speaker-card__name, .speaker-card__role",
            dmode: "translate",
            components: [
              {
                type: "text",
                name: "Nome do painelista",
                classes: ["speaker-card__name"],
                content: panelistDefaultName,
                editable: true,
                selectable: true,
                hoverable: true,
                layerable: true,
                draggable: ".speaker-card__content",
                droppable: false,
                dmode: "translate",
              },
              {
                type: "text",
                name: "Cargo ou instituicao",
                classes: ["speaker-card__role"],
                content: panelistDefaultRole,
                editable: true,
                selectable: true,
                hoverable: true,
                layerable: true,
                draggable: ".speaker-card__content",
                droppable: false,
                dmode: "translate",
              },
            ],
          },
        ],
      },
    },
  });

  editor.Commands.add("cbdas-panelist-edit-image", {
    run: () => {
      const selected = editor.getSelected();
      const component = selected?.closest(panelistCardSelector) ?? selected;

      if (component?.getAttributes()["data-speaker-card"] !== undefined) {
        openPanelistImageAssetManager(editor, component);
      }
    },
  });

  [
    "panelistImage",
    "panelistAlt",
    "panelistObjectX",
    "panelistObjectY",
    "panelistName",
    "panelistRole",
    "panelistSize",
    "panelistAlignment",
    "panelistImagePosition",
    "panelistWidth",
  ].forEach((propertyName) => {
    editor.on(`component:update:${propertyName}`, (component: Component) => {
      if (component.getAttributes()["data-speaker-card"] === undefined) {
        return;
      }

      syncPanelistCardComponent(component);
    });
  });

  editor.on("component:update:panelistName", (component: Component) => {
    if (component.getAttributes()["data-speaker-card"] === undefined) {
      return;
    }

    const currentAlt = getPanelistCardValue(component, "panelistAlt", "");

    if (!currentAlt || currentAlt === panelistDefaultName) {
      component.set("panelistAlt", getPanelistCardValue(component, "panelistName", panelistDefaultName));
    }
  });

  editor.on("component:add", (component: Component) => {
    const attributes = component.getAttributes();

    if (attributes["data-speaker-card"] !== undefined) {
      window.setTimeout(() => configurePanelistComponents(editor), 0);
    }
  });

}

function registerDevicePreviewCommands(editor: Editor) {
  const setDevice = (deviceName: "Desktop" | "Tablet" | "Mobile") => {
    editor.setDevice(deviceName);
    editor.refresh();
  };

  editor.Commands.add("set-device-desktop", {
    run: () => setDevice("Desktop"),
    stop: () => {},
  });

  editor.Commands.add("set-device-tablet", {
    run: () => setDevice("Tablet"),
    stop: () => {},
  });

  editor.Commands.add("set-device-mobile", {
    run: () => setDevice("Mobile"),
    stop: () => {},
  });
}

function ensureDeleteComponentToolbarButton(editor: Editor, component: Component) {
  if (component === editor.getWrapper()) {
    return;
  }

  if (component.get("removable") === false) {
    return;
  }

  const toolbar = component.get("toolbar") ?? [];
  const hasDeleteComponentButton = toolbar.some(
    (item) => item.command === "cbdas-delete-selected-component",
  );

  if (hasDeleteComponentButton) {
    return;
  }

  const deleteButton = {
    attributes: {
      class: "fa fa-times",
      title: "Excluir componente inteiro",
    },
    command: "cbdas-delete-selected-component",
  };
  const trashIndex = toolbar.findIndex((item) => item.command === "tlb-delete");
  const nextToolbar =
    trashIndex === -1
      ? [...toolbar, deleteButton]
      : [...toolbar.slice(0, trashIndex + 1), deleteButton, ...toolbar.slice(trashIndex + 1)];

  component.set("toolbar", nextToolbar);
}

function registerDeleteComponentCommand(editor: Editor) {
  editor.Commands.add("cbdas-delete-selected-component", {
    run: () => {
      const selected = editor.getSelected();

      if (!selected || selected === editor.getWrapper() || selected.get("removable") === false) {
        return;
      }

      selected.remove();
      editor.select(undefined);
      editor.refresh();
    },
  });

  editor.on("component:selected", (component: Component) => {
    ensureDeleteComponentToolbarButton(editor, component);
  });
}

export default function LandingEditor({
  initialHtml,
  initialCss,
  siteCssHref,
  shortcutsBackgroundHref,
  snapshotSourceHtml,
}: LandingEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const snapshotSourceFrameRef = useRef<HTMLIFrameElement | null>(null);
  const snapshotAppliedRef = useRef(false);
  const snapshotPollRef = useRef<number | null>(null);
  const snapshotPreparationStepRef = useRef<"idle" | "scrolled" | "restoring" | "ready">("idle");
  const snapshotHeaderStateRef = useRef<SnapshotHeaderState>({
    topLogoSrc: "",
    scrolledLogoSrc: "",
  });
  const headerRuntimeCleanupRef = useRef<(() => void) | null>(null);
  const imageContextCleanupRef = useRef<(() => void) | null>(null);
  const imageContextTargetRef = useRef<Component | null>(null);
  const installImageContextMenuRef = useRef<(editor: Editor) => void>(() => {});
  const [shouldLoadSnapshotSource, setShouldLoadSnapshotSource] = useState(false);
  const [status, setStatus] = useState("Carregando editor...");
  const [imageContextMenu, setImageContextMenu] = useState<ImageContextMenuState | null>(null);

  const closeImageContextMenu = useCallback(() => {
    imageContextTargetRef.current = null;
    setImageContextMenu(null);
  }, []);

  const installImageContextMenu = useCallback(
    (editor: Editor) => {
      imageContextCleanupRef.current?.();

      const canvasDocument = editor.Canvas.getDocument();

      if (!canvasDocument) {
        imageContextCleanupRef.current = null;
        return;
      }

      const openImageUploadPopup = (event: MouseEvent) => {
        const target = event.target;

        if (!(target instanceof HTMLElement)) {
          return;
        }

        const imageComponent = getImageComponentFromContextTarget(editor, target, event);

        if (!imageComponent) {
          return;
        }

        const frameRect = editor.Canvas.getFrameEl().getBoundingClientRect();

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        imageContextTargetRef.current = imageComponent;
        editor.select(imageComponent);
        setImageContextMenu({
          x: Math.min(window.innerWidth - 260, frameRect.left + event.clientX),
          y: Math.min(window.innerHeight - 170, frameRect.top + event.clientY),
          mode: "upload",
          isUploading: false,
          isDragOver: false,
          error: "",
        });
      };

      const handleCanvasDoubleClick = (event: MouseEvent) => {
        const target = event.target;

        if (!(target instanceof HTMLElement)) {
          return;
        }

        const clickedImage = getImageElementFromContextTarget(
          target,
          event.clientX,
          event.clientY,
        );
        const imageComponent = clickedImage
          ? getImageComponentFromElement(editor, clickedImage)
          : undefined;

        if (imageComponent && clickedImage) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          imageContextTargetRef.current = null;
          setImageContextMenu(null);

          if (activeImageEdit?.image !== clickedImage) {
            beginImageResize(editor, imageComponent, clickedImage);
          }

          setStatus(
            "Segure e arraste a imagem para movê-la dentro do componente. Use as alças para redimensionar.",
          );
          return;
        }

        const textComponent = getTextComponentFromTarget(editor, target);

        if (!textComponent) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        deactivateImageEditMode();
        beginTextEdit(editor, textComponent, event);
        setStatus("Texto em edição. Clique fora do campo para concluir.");
      };

      const handleImagePointerDown = (event: PointerEvent) => {
        if (event.button !== 0 || isResizerHandle(event.target)) {
          return;
        }

        const target = event.target;

        if (!(target instanceof HTMLElement)) {
          return;
        }

        const clickedImage = getImageElementFromContextTarget(
          target,
          event.clientX,
          event.clientY,
        );
        const imageComponent = clickedImage
          ? getImageComponentFromElement(editor, clickedImage)
          : undefined;

        if (event.detail >= 2 && clickedImage && imageComponent) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          imageContextTargetRef.current = null;
          setImageContextMenu(null);
          beginImageResize(editor, imageComponent, clickedImage);
          beginImagePan(event, imageComponent, clickedImage);
          setStatus("Solte para fixar a posição da imagem no componente.");
          return;
        }

        if (!activeImageEdit || !clickedImage || clickedImage !== activeImageEdit.image) {
          if (activeImageEdit && clickedImage !== activeImageEdit.image) {
            deactivateImageEditMode();
          }

          return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        beginImagePan(event, activeImageEdit.component, clickedImage);
        setStatus("Solte para fixar a posição da imagem no componente.");
      };

      const handleImagePointerMove = (event: PointerEvent) => {
        if (!activeImagePan) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        moveActiveImagePan(event);
      };

      const handleImagePointerUp = (event: PointerEvent) => {
        if (!activeImagePan) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        endActiveImagePan(event);
        setStatus(
          "Segure e arraste a imagem para movê-la dentro do componente. Use as alças para redimensionar.",
        );
      };

      canvasDocument.addEventListener("contextmenu", openImageUploadPopup);
      canvasDocument.addEventListener("dblclick", handleCanvasDoubleClick, true);
      canvasDocument.addEventListener("pointerdown", handleImagePointerDown, true);
      canvasDocument.addEventListener("pointermove", handleImagePointerMove, true);
      canvasDocument.addEventListener("pointerup", handleImagePointerUp, true);
      canvasDocument.addEventListener("pointercancel", handleImagePointerUp, true);
      imageContextCleanupRef.current = () => {
        deactivateImageEditMode();
        canvasDocument.removeEventListener("contextmenu", openImageUploadPopup);
        canvasDocument.removeEventListener("dblclick", handleCanvasDoubleClick, true);
        canvasDocument.removeEventListener("pointerdown", handleImagePointerDown, true);
        canvasDocument.removeEventListener("pointermove", handleImagePointerMove, true);
        canvasDocument.removeEventListener("pointerup", handleImagePointerUp, true);
        canvasDocument.removeEventListener("pointercancel", handleImagePointerUp, true);
      };
    },
    [],
  );

  useEffect(() => {
    installImageContextMenuRef.current = installImageContextMenu;
  }, [installImageContextMenu]);

  const replaceContextImage = useCallback(
    async (file: File) => {
      const imageComponent = imageContextTargetRef.current;
      const editor = editorRef.current;

      if (!editor || !imageComponent) {
        setImageContextMenu((current) =>
          current
            ? {
                ...current,
                isUploading: false,
                isDragOver: false,
                error: "Selecione novamente a imagem com o botao direito.",
              }
            : current,
        );
        return;
      }

      if (!isLikelyImageFile(file)) {
        setImageContextMenu((current) =>
          current
            ? {
                ...current,
                isUploading: false,
                isDragOver: false,
                error: "Envie um arquivo de imagem (PNG, JPG, WEBP ou SVG).",
              }
            : current,
        );
        return;
      }

      setImageContextMenu((current) =>
        current
          ? { ...current, isUploading: true, isDragOver: false, error: "" }
          : current,
      );

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/cms/editor/upload-image", {
          method: "POST",
          credentials: "same-origin",
          body: formData,
        });
        const payload = (await response.json().catch(() => ({}))) as {
          src?: unknown;
          error?: unknown;
        };

        if (!response.ok || typeof payload.src !== "string") {
          setImageContextMenu((current) =>
            current
              ? {
                  ...current,
                  isUploading: false,
                  error:
                    typeof payload.error === "string"
                      ? payload.error
                      : "Nao foi possivel enviar a imagem.",
                }
              : current,
          );
          return;
        }

        setImageComponentSrc(editor, imageComponent, payload.src);
        closeImageContextMenu();
        setStatus("Imagem substituida no editor.");
      } catch {
        setImageContextMenu((current) =>
          current
            ? {
                ...current,
                isUploading: false,
                error: "Falha ao enviar a imagem. Tente novamente.",
              }
            : current,
        );
      }
    },
    [closeImageContextMenu],
  );

  const applySnapshotClone = useCallback((editor: Editor, clone: HTMLElement) => {
    normalizeSnapshotUrls(clone);
    freezeHeroSubtitle(clone);
    markHeroForEditorSpacing(clone);
    restoreShortcutsBackground(clone, shortcutsBackgroundHref);

    snapshotAppliedRef.current = true;
    headerRuntimeCleanupRef.current?.();
    editor.setComponents(clone.outerHTML);
    configureProgramScheduleComponents(editor);
    configureHeaderMenuComponents(editor);
    configureSpeakerComponents(editor);
    configurePanelistComponents(editor);
    editor.setStyle(getEditorRestorationCss(shortcutsBackgroundHref));
    headerRuntimeCleanupRef.current = installCanvasHeaderRuntime(
      editor,
      snapshotHeaderStateRef.current,
    );
    setStatus("Site original carregado no editor.");
  }, [shortcutsBackgroundHref]);

  const applySnapshotFromSourceFrame = (attempt = 0) => {
    if (snapshotAppliedRef.current) {
      return;
    }

    const editor = editorRef.current;
    const sourceWindow = snapshotSourceFrameRef.current?.contentWindow;
    const sourceDocument = snapshotSourceFrameRef.current?.contentDocument;
    const root = sourceDocument?.getElementById("root");
    const missingSections = expectedSectionSelectors.filter(
      (selector) => !root?.querySelector(selector),
    );
    const text = root?.textContent ?? "";
    const isStillLoading = text.includes("Carregando") && text.length < 80;

    if (!editor || !root || isStillLoading || missingSections.length > 0) {
      if (attempt < 120) {
        snapshotPollRef.current = window.setTimeout(() => {
          applySnapshotFromSourceFrame(attempt + 1);
        }, 100);
      }
      return;
    }

    if (sourceWindow && snapshotPreparationStepRef.current === "idle") {
      snapshotHeaderStateRef.current.topLogoSrc = normalizeUrl(getHeaderLogoSrc(root));
      snapshotPreparationStepRef.current = "scrolled";
      sourceWindow.scrollTo(0, 80);
      snapshotPollRef.current = window.setTimeout(() => {
        applySnapshotFromSourceFrame(attempt + 1);
      }, 180);
      return;
    }

    if (sourceWindow && snapshotPreparationStepRef.current === "scrolled") {
      snapshotHeaderStateRef.current.scrolledLogoSrc = normalizeUrl(getHeaderLogoSrc(root));
      snapshotPreparationStepRef.current = "restoring";
      sourceWindow.scrollTo(0, 0);
      snapshotPollRef.current = window.setTimeout(() => {
        applySnapshotFromSourceFrame(attempt + 1);
      }, 180);
      return;
    }

    snapshotPreparationStepRef.current = "ready";
    applySnapshotClone(editor, root.cloneNode(true) as HTMLElement);
  };

  useEffect(() => {
    let disposed = false;

    async function loadEditor() {
      if (!containerRef.current || editorRef.current) {
        return;
      }

      const [{ default: grapesjs }, { default: presetWebpage }] = await Promise.all([
        import("grapesjs"),
        import("grapesjs-preset-webpage"),
      ]);

      if (disposed || !containerRef.current) {
        return;
      }

      const editor = grapesjs.init({
        container: containerRef.current,
        height: "100%",
        width: "100%",
        fromElement: false,
        components: initialHtml,
        style: initialCss,
        storageManager: false,
        plugins: [presetWebpage],
        canvas: {
          styles: [
            "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap",
            siteCssHref,
          ].filter(Boolean),
        },
        deviceManager: {
          devices: [
            { id: "desktop", name: "Desktop", width: "" },
            { id: "tablet", name: "Tablet", width: "768px", widthMedia: "992px" },
            { id: "mobile", name: "Mobile", width: "375px", widthMedia: "480px" },
          ],
        },
      });

      registerProgramScheduleEditing(editor);
      registerSpeakerCardEditing(editor);
      registerPanelistCardEditing(editor);
      registerImageResizeEditing(editor);
      registerTextEditing(editor);
      registerDevicePreviewCommands(editor);
      registerDeleteComponentCommand(editor);
      editor.on("canvas:load", () => {
        installImageContextMenuRef.current(editor);
      });
      editor.setComponents(initialHtml);
      editor.setStyle(initialCss);
      configureProgramScheduleComponents(editor);
      configureHeaderMenuComponents(editor);
      configureSpeakerComponents(editor);
      configurePanelistComponents(editor);
      window.setTimeout(() => installImageContextMenuRef.current(editor), 0);

      const handleSnapshot = (event: MessageEvent) => {
        if (
          event.origin !== window.location.origin &&
          event.source !== snapshotSourceFrameRef.current?.contentWindow
        ) {
          return;
        }

        const data = event.data as { type?: unknown; html?: unknown };

        if (
          snapshotAppliedRef.current ||
          data.type !== "cbdas-site-snapshot" ||
          typeof data.html !== "string"
        ) {
          return;
        }

        const wrapper = document.createElement("div");
        wrapper.innerHTML = data.html;
        const clone = wrapper.firstElementChild;

        if (clone instanceof HTMLElement) {
          applySnapshotClone(editor, clone);
        }
      };

      window.addEventListener("message", handleSnapshot);
      if (snapshotSourceHtml) {
        setShouldLoadSnapshotSource(true);
      } else {
        snapshotAppliedRef.current = true;
      }

      editor.BlockManager.add("cbdas-hero", {
        label: "Hero CBDAS",
        category: "CBDAS",
        content: `<section class="cbdas-hero"><div class="cbdas-hero-copy"><p class="cbdas-kicker">IDASAN apresenta</p><h1>Novo titulo da landing</h1><p class="cbdas-lead">Texto de apoio para chamada principal.</p><div class="cbdas-actions"><a class="cbdas-button cbdas-button-primary" href="#">Botao principal</a></div></div><img class="cbdas-hero-image" src="/assets/heroasset-D7iW3WGy.png" alt="CBDAS" /></section>`,
      });

      editor.BlockManager.add("cbdas-section", {
        label: "Secao de texto",
        category: "CBDAS",
        content: `<section class="cbdas-section cbdas-two-columns"><div><p class="cbdas-kicker">Editavel</p><h2>Titulo da secao</h2></div><p>Edite este texto no painel visual.</p></section>`,
      });

      editor.BlockManager.add("cbdas-card", {
        label: "Card",
        category: "CBDAS",
        content: `<article class="cbdas-card"><p class="cbdas-card-label">Categoria</p><h3>Titulo do card</h3><p>Descricao do card.</p></article>`,
      });

      editor.BlockManager.add("cbdas-speaker", {
        label: "Palestrante Confirmado",
        category: "CBDAS",
        attributes: {
          title: "Adicionar palestrante confirmado",
        },
        content: speakerBlockContent,
      });

      editor.BlockManager.add("speaker-card", {
        label: "Adicionar Painelista",
        category: "CBDAS",
        media: panelistBlockIcon,
        attributes: {
          title: "Adicionar painelista",
        },
        content: {
          type: "speaker-card",
        },
      });

      const saveCurrentEditor = async () => {
        const project = {
          html: editor.getHtml(),
          css: editor.getCss(),
          siteCssHref,
          mode: "original-site",
        };

        const response = await fetch("/cms/editor/save", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(project),
        });
        const payload = (await response.json().catch(() => ({}))) as {
          error?: unknown;
          revisionId?: unknown;
        };

        if (!response.ok) {
          throw new Error(
            typeof payload.error === "string"
              ? payload.error
              : "Nao foi possivel salvar a versao do site.",
          );
        }

        window.localStorage.removeItem(draftKey);

        const revisionId =
          typeof payload.revisionId === "number"
            ? payload.revisionId
            : typeof payload.revisionId === "string" && /^\d+$/.test(payload.revisionId)
              ? Number(payload.revisionId)
              : null;

        return { revisionId };
      };

      editor.Panels.addButton("options", [
        {
          id: "save-draft",
          className: "fa fa-save",
          label: "Salvar",
          command: async () => {
            try {
              setStatus("Salvando versao do site...");
              const saved = await saveCurrentEditor();
              setStatus(
                saved.revisionId
                  ? `Versao ${saved.revisionId} salva — ativa em / e pronta para publicar.`
                  : "Versao do site salva — ativa em / e pronta para publicar.",
              );
            } catch (error) {
              setStatus(
                error instanceof Error ? error.message : "Nao foi possivel salvar a versao do site.",
              );
            }
          },
        },
        {
          id: "preview-saved-page",
          className: "fa fa-eye",
          label: "Preview",
          command: () => {
            window.open("/cms/preview", "_blank", "noopener,noreferrer");
          },
        },
        {
          id: "publish-page",
          className: "fa fa-upload",
          label: "Publicar",
          command: async () => {
            try {
              setStatus("Salvando versao do site antes de publicar...");
              const saved = await saveCurrentEditor();
              setStatus(
                saved.revisionId
                  ? `Versao ${saved.revisionId} salva. Iniciando publicacao SFTP...`
                  : "Iniciando publicacao SFTP...",
              );
              await fetch("/cms/session/refresh", {
                method: "POST",
                credentials: "same-origin",
              }).catch(() => {});

              const publishResponse = await fetch("/api/cms/publish", {
                method: "POST",
                credentials: "same-origin",
              });
              const publishPayload = (await publishResponse.json().catch(() => ({}))) as {
                deploymentId?: unknown;
                error?: unknown;
                status?: unknown;
              };

              if (!publishResponse.ok || typeof publishPayload.deploymentId !== "string") {
                setStatus(
                  typeof publishPayload.error === "string"
                    ? publishPayload.error
                    : "Nao foi possivel iniciar a publicacao SFTP.",
                );
                return;
              }

              setStatus(
                publishPayload.status === "published"
                  ? `Publicacao concluida: ${publishPayload.deploymentId}`
                  : publishPayload.status === "failed" || publishPayload.status === "rolled_back"
                    ? `Publicacao finalizada com falha: ${publishPayload.deploymentId}`
                    : `Publicacao iniciada: ${publishPayload.deploymentId}`,
              );
              window.open("/cms/publicacao", "_blank", "noopener,noreferrer");
            } catch {
              setStatus("Nao foi possivel iniciar a publicacao SFTP.");
            }
          },
        },
        {
          id: "clear-draft",
          className: "fa fa-trash",
          label: "Limpar",
          command: () => {
            window.localStorage.removeItem(draftKey);
            editor.setComponents(initialHtml);
            configureProgramScheduleComponents(editor);
            configureHeaderMenuComponents(editor);
            configureSpeakerComponents(editor);
            configurePanelistComponents(editor);
            editor.setStyle(initialCss);
            setStatus("Editor restaurado para a ultima versao carregada. Clique em Salvar para persistir.");
          },
        },
      ]);

      editor.on("update", () => {
        setStatus("Alteracoes pendentes. Clique em Salvar para persistir e liberar para preview/publicacao.");
      });

      editorRef.current = editor;
      setStatus(
        snapshotSourceHtml
          ? "Editor pronto com o site de apps/site/dist."
          : "Editor pronto com a ultima versao salva/publicada.",
      );

      editor.on("destroy", () => {
        window.removeEventListener("message", handleSnapshot);
        imageContextCleanupRef.current?.();
        imageContextCleanupRef.current = null;
      });
    }

    loadEditor().catch((error) => {
      console.error(error);
      setStatus("Nao foi possivel carregar o editor.");
    });

    return () => {
      disposed = true;
      setShouldLoadSnapshotSource(false);
      headerRuntimeCleanupRef.current?.();
      headerRuntimeCleanupRef.current = null;
      imageContextCleanupRef.current?.();
      imageContextCleanupRef.current = null;
      imageContextTargetRef.current = null;
      if (snapshotPollRef.current !== null) {
        window.clearTimeout(snapshotPollRef.current);
        snapshotPollRef.current = null;
      }
      editorRef.current?.destroy();
      editorRef.current = null;
    };
  }, [applySnapshotClone, initialCss, initialHtml, siteCssHref, shortcutsBackgroundHref, snapshotSourceHtml]);

  return (
    <main className="flex h-screen min-h-0 flex-col bg-[#101827] text-white">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[#081736] px-4">
        <div className="flex items-center gap-4">
          <Link href="/cms" className="text-sm font-semibold text-white/72 hover:text-white">
            CMS
          </Link>
          <h1 className="text-base font-semibold">Editor visual da Landing CBDAS</h1>
        </div>
        <div className="flex items-center gap-4">
          <p className="hidden text-xs font-medium text-white/58 md:block">{status}</p>
          <Link
            href="/"
            className="rounded-md border border-white/14 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/84 hover:bg-white/10"
          >
            Ver site
          </Link>
        </div>
      </header>
      {shouldLoadSnapshotSource && snapshotSourceHtml ? (
        <iframe
          ref={snapshotSourceFrameRef}
          aria-hidden="true"
          srcDoc={snapshotSourceHtml}
          title="Fonte do snapshot do site"
          className="pointer-events-none fixed left-0 top-0 -translate-x-[200vw] opacity-0"
          style={{
            width: snapshotViewport.width,
            height: snapshotViewport.height,
          }}
          tabIndex={-1}
          onLoad={() => applySnapshotFromSourceFrame()}
        />
      ) : null}
      {imageContextMenu ? (
        <div className="fixed inset-0 z-[80]" onMouseDown={closeImageContextMenu}>
          <div
            className="w-[250px] overflow-hidden rounded-lg border border-white/12 bg-[#111827] text-white shadow-2xl"
            style={{
              left: imageContextMenu.x,
              top: imageContextMenu.y,
              position: "fixed",
            }}
            onMouseDown={(event) => event.stopPropagation()}
            onDragEnter={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setImageContextMenu((current) =>
                current && current.mode === "upload"
                  ? { ...current, isDragOver: true, error: "" }
                  : current,
              );
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.stopPropagation();
              event.dataTransfer.dropEffect = "copy";
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              event.stopPropagation();

              if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
                return;
              }

              setImageContextMenu((current) =>
                current ? { ...current, isDragOver: false } : current,
              );
            }}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              const file = event.dataTransfer.files.item(0);

              if (file) {
                void replaceContextImage(file);
              }
            }}
          >
            {imageContextMenu.mode === "menu" ? (
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-white/90 hover:bg-white/10"
                onClick={() =>
                  setImageContextMenu((current) =>
                    current
                      ? { ...current, mode: "upload", isDragOver: false, error: "" }
                      : current,
                  )
                }
              >
                <span className="fa fa-image text-white/66" aria-hidden="true" />
                Alterar imagem
              </button>
            ) : (
              <div className="grid gap-3 p-3">
                <label
                  className={`flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-4 py-5 text-center text-xs font-semibold transition ${
                    imageContextMenu.isDragOver
                      ? "border-[#f9d600] bg-[#f9d600]/12 text-white"
                      : "border-white/30 bg-white/6 text-white/76 hover:border-[#f9d600] hover:bg-white/10"
                  }`}
                >
                  <span className="fa fa-cloud-upload mb-2 text-lg text-[#f9d600]" aria-hidden="true" />
                  {imageContextMenu.isUploading
                    ? "Enviando imagem..."
                    : imageContextMenu.isDragOver
                      ? "Solte para substituir a imagem"
                      : "Arraste uma imagem aqui ou clique para escolher"}
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/*,.png,.jpg,.jpeg,.webp,.svg,.gif,.avif"
                    disabled={imageContextMenu.isUploading}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.item(0);

                      if (file) {
                        void replaceContextImage(file);
                      }

                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                {imageContextMenu.error ? (
                  <p className="text-xs font-medium text-red-200">{imageContextMenu.error}</p>
                ) : null}
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    className="rounded-md px-3 py-1.5 text-xs font-semibold text-white/64 hover:bg-white/10 hover:text-white"
                    onClick={() =>
                      setImageContextMenu((current) =>
                        current
                          ? { ...current, mode: "menu", isDragOver: false, error: "" }
                          : current,
                      )
                    }
                    disabled={imageContextMenu.isUploading}
                  >
                    Voltar
                  </button>
                  <span className="text-xs font-semibold text-white/54">
                    {imageContextMenu.isUploading ? "Enviando..." : "PNG, JPG, WEBP, SVG"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
      <div ref={containerRef} className="min-h-0 flex-1" />
    </main>
  );
}
