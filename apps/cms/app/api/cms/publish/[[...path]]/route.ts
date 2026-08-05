import { isCmsAuthenticated } from "@/app/cms/_lib/auth";
import {
  createDeployment,
  getDeployment,
  getDeploymentHistory,
  rollbackDeployment,
} from "@/server/publishing/publisher";
import { DeploymentError } from "@/server/publishing/types";

type PublishRouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(_request: Request, context: PublishRouteContext) {
  if (!(await isCmsAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const segments = (await context.params).path ?? [];

  if (segments.length === 1 && segments[0] === "history") {
    return Response.json({ deployments: await getDeploymentHistory() });
  }

  if (segments.length === 1) {
    const record = await getDeployment(segments[0]);

    if (!record) {
      return Response.json({ error: "Deployment not found" }, { status: 404 });
    }

    return Response.json({ deployment: record });
  }

  return Response.json({ error: "Not found" }, { status: 404 });
}

export async function POST(_request: Request, context: PublishRouteContext) {
  if (!(await isCmsAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const segments = (await context.params).path ?? [];

  if (segments.length === 0) {
    try {
      const record = await createDeployment("cms-admin");

      return Response.json({
        deployment: record,
        deploymentId: record.id,
        status: record.status,
      });
    } catch (error) {
      if (error instanceof DeploymentError && error.code === "DEPLOYMENT_ALREADY_RUNNING") {
        return Response.json(
          {
            error: error.message,
            errorCode: error.code,
          },
          { status: 409 },
        );
      }

      return Response.json(
        {
          error: error instanceof Error ? error.message : "Nao foi possivel iniciar a publicacao.",
          errorCode: error instanceof DeploymentError ? error.code : "RELEASE_BUILD_FAILED",
        },
        { status: 400 },
      );
    }
  }

  if (segments.length === 2 && segments[1] === "rollback") {
    try {
      await rollbackDeployment(segments[0], "cms-admin");

      return Response.json({ ok: true });
    } catch (error) {
      return Response.json(
        {
          error: error instanceof Error ? error.message : "Rollback falhou.",
          errorCode: error instanceof DeploymentError ? error.code : "ROLLBACK_FAILED",
        },
        {
          status:
            error instanceof DeploymentError && error.code === "DEPLOYMENT_ALREADY_RUNNING"
              ? 409
              : 400,
        },
      );
    }
  }

  return Response.json({ error: "Not found" }, { status: 404 });
}
