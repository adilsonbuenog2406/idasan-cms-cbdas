import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  landingSlug,
  normalizeSftpHost,
  type SftpPublishConfig,
  validateRemotePath,
  validateSftpPort,
} from "../../server/publishing/config";
import { createDeploymentManifest } from "../../server/publishing/create-manifest";
import {
  assertRemotePathInsidePublishRoot,
  backupReuseWindowMs,
  resolvePublishRemotePath,
  selectReusableBackupPath,
} from "../../server/publishing/sftp-publisher";
import {
  injectDeploymentMeta,
  rewritePublishedHtml,
  writePublishedLandingIndex,
} from "../../server/publishing/build-release";
import { validateRelease } from "../../server/publishing/validate-release";
import { shouldExecuteDeploymentInline } from "../../server/publishing/publisher";
import { DeploymentError } from "../../server/publishing/types";

async function withTempDir(run: (dir: string) => Promise<void>) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "cms-publishing-test-"));

  try {
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("valida caminho remoto permitido", () => {
  assert.equal(
    validateRemotePath(`/public_html/${landingSlug}`),
    `/public_html/${landingSlug}`,
  );
});

test("bloqueia caminho remoto perigoso", () => {
  assert.throws(() => validateRemotePath("/"), DeploymentError);
  assert.throws(() => validateRemotePath("/public_html"), DeploymentError);
  assert.throws(() => validateRemotePath(`/public_html/../${landingSlug}`), DeploymentError);
  assert.throws(() => validateRemotePath(`/public_html/outro-site`), DeploymentError);
});

test("bloqueia host SFTP com protocolo FTP", () => {
  assert.throws(() => normalizeSftpHost("ftp://147.93.38.36"), DeploymentError);
});

test("bloqueia porta FTP para publicacao SFTP", () => {
  assert.throws(() => validateSftpPort(21), DeploymentError);
  assert.equal(validateSftpPort(65002), 65002);
});

test("executa publicacao inline em Vercel para evitar background serverless", () => {
  const previousVercel = process.env.VERCEL;
  const previousMode = process.env.CMS_PUBLISH_EXECUTION_MODE;

  try {
    process.env.VERCEL = "1";
    delete process.env.CMS_PUBLISH_EXECUTION_MODE;
    assert.equal(shouldExecuteDeploymentInline(), true);

    process.env.CMS_PUBLISH_EXECUTION_MODE = "background";
    assert.equal(shouldExecuteDeploymentInline(), false);
  } finally {
    if (previousVercel === undefined) {
      delete process.env.VERCEL;
    } else {
      process.env.VERCEL = previousVercel;
    }

    if (previousMode === undefined) {
      delete process.env.CMS_PUBLISH_EXECUTION_MODE;
    } else {
      process.env.CMS_PUBLISH_EXECUTION_MODE = previousMode;
    }
  }
});

test("resolve public_html para layout de dominios da Hostinger", async () => {
  const config = {
    publicLandingPageUrl: `https://idasan.com.br/${landingSlug}/`,
    remotePath: `/public_html/${landingSlug}`,
  } as SftpPublishConfig;
  const client = {
    async exists(remotePath: string) {
      return remotePath === "domains/idasan.com.br/public_html" ? "d" : false;
    },
  };

  assert.equal(
    await resolvePublishRemotePath(client, config),
    `domains/idasan.com.br/public_html/${landingSlug}`,
  );
});

test("bloqueia escrita fora da pasta da landing", () => {
  const root = `domains/idasan.com.br/public_html/${landingSlug}`;

  assert.equal(assertRemotePathInsidePublishRoot(root, root), root);
  assert.equal(
    assertRemotePathInsidePublishRoot(root, `${root}/assets/index.css`),
    `${root}/assets/index.css`,
  );
  assert.throws(
    () => assertRemotePathInsidePublishRoot(root, "domains/idasan.com.br/public_html/.cms-backups"),
    DeploymentError,
  );
  assert.throws(
    () => assertRemotePathInsidePublishRoot(root, `${root}-backup/assets/index.css`),
    DeploymentError,
  );
});

test("reutiliza backup remoto criado nos ultimos 7 dias", () => {
  const backupsRoot = `domains/idasan.com.br/public_html/${landingSlug}/.cms-backups`;
  const nowMs = Date.parse("2026-07-13T12:00:00.000Z");

  assert.equal(
    selectReusableBackupPath({
      backupsRoot,
      entries: [
        {
          name: `${landingSlug}-2026-07-01T12-00-00-000Z`,
          type: "d",
        },
        {
          name: `${landingSlug}-2026-07-11T09-30-00-000Z`,
          type: "d",
        },
        {
          name: `${landingSlug}-2026-07-12T09-30-00-000Z`,
          type: "d",
        },
      ],
      maxAgeMs: backupReuseWindowMs,
      nowMs,
    }),
    `${backupsRoot}/${landingSlug}-2026-07-12T09-30-00-000Z`,
  );

  assert.equal(
    selectReusableBackupPath({
      backupsRoot,
      entries: [
        {
          name: `${landingSlug}-2026-07-01T12-00-00-000Z`,
          type: "d",
        },
      ],
      maxAgeMs: backupReuseWindowMs,
      nowMs,
    }),
    null,
  );
});

test("injeta deployment id no html salvo", () => {
  const html = injectDeploymentMeta(
    `<!doctype html><html><head></head><body><div id="root">landing salva</div></body></html>`,
    "deployment-test",
  );

  assert.match(html, /cms-deployment-id/);
  assert.match(html, /landing salva/);
});

test("publicacao usa a landing salva com paths relativos e runtime", async () => {
  await withTempDir(async (dir) => {
    const releaseIndexPath = path.join(dir, "index.html");
    const savedLanding = `<!doctype html><html><head><link rel="stylesheet" href="/assets/index-test.css"></head><body><div id="root"><img src="/assets/hero.png" alt=""><img src="/uploads/foto.png" alt="">landing salva</div></body></html>`;

    await writePublishedLandingIndex(releaseIndexPath, "deployment-test", savedLanding);

    const html = await readFile(releaseIndexPath, "utf8");

    assert.match(html, /landing salva/);
    assert.match(html, /cms-deployment-id/);
    assert.match(html, /cms-published-runtime-style/);
    assert.match(html, /cms-published-runtime-script/);
    assert.match(html, /href="assets\/index-test\.css"/);
    assert.match(html, /src="assets\/hero\.png"/);
    assert.match(html, /src="uploads\/foto\.png"/);
    assert.doesNotMatch(html, /href="\/assets\//);
  });
});

test("rewritePublishedHtml reescreve assets absolutos para relativos", () => {
  const html = rewritePublishedHtml(
    `<!doctype html><html><head><link href="/assets/a.css"></head><body><img src="/assets/b.png"></body></html>`,
    "deployment-test",
  );

  assert.match(html, /href="assets\/a\.css"/);
  assert.match(html, /src="assets\/b\.png"/);
  assert.match(html, /cms-deployment-id/);
});

test("bloqueia publicacao quando nenhuma landing salva existe", async () => {
  await withTempDir(async (dir) => {
    await assert.rejects(
      () => writePublishedLandingIndex(path.join(dir, "index.html"), "deployment-test", "   "),
      DeploymentError,
    );
  });
});

test("cria manifesto com sha256 e tamanhos", async () => {
  await withTempDir(async (dir) => {
    await mkdir(path.join(dir, "assets"), { recursive: true });
    await writeFile(path.join(dir, "index.html"), "<html>ok</html>", "utf8");
    await writeFile(path.join(dir, "assets/style.css"), "body{}", "utf8");

    const { manifest } = await createDeploymentManifest(dir, "deployment-test");
    const indexFile = manifest.files.find((file) => file.relativePath === "index.html");

    assert.equal(manifest.totalFiles, 2);
    assert.equal(indexFile?.sha256, createHash("sha256").update("<html>ok</html>").digest("hex"));
  });
});

test("bloqueia release sem index.html", async () => {
  await withTempDir(async (dir) => {
    await writeFile(path.join(dir, "asset.txt"), "ok", "utf8");
    const { manifest } = await createDeploymentManifest(dir, "deployment-test");

    await assert.rejects(() => validateRelease(dir, manifest), DeploymentError);
  });
});

test("bloqueia path traversal no manifesto", async () => {
  await withTempDir(async (dir) => {
    await writeFile(path.join(dir, "index.html"), "<html>ok</html>", "utf8");
    const { manifest } = await createDeploymentManifest(dir, "deployment-test");
    manifest.files.push({
      mimeType: "text/plain; charset=utf-8",
      relativePath: "../secret.txt",
      sha256: "x",
      size: 1,
    });
    manifest.totalFiles += 1;

    await assert.rejects(() => validateRelease(dir, manifest), DeploymentError);
  });
});

test("bloqueia conteúdo sensível em arquivos textuais", async () => {
  await withTempDir(async (dir) => {
    await writeFile(
      path.join(dir, "index.html"),
      "<html>SFTP_PASSWORD=super-secret</html>",
      "utf8",
    );
    const { manifest } = await createDeploymentManifest(dir, "deployment-test");

    await assert.rejects(() => validateRelease(dir, manifest), DeploymentError);
  });
});
