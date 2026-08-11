import Client from "ssh2-sftp-client";
import type { ConnectOptions } from "ssh2-sftp-client";
import { DeploymentError } from "./types";
import type { SftpPublishConfig } from "./config";

function normalizeFingerprint(value: string) {
  return value.replace(/^SHA256:/i, "").replaceAll(":", "").trim();
}

function getConnectionErrorMessage(message: string) {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("sftp session") ||
    lowerMessage.includes("subsystem") ||
    lowerMessage.includes("exit code 1")
  ) {
    return {
      code: "SFTP_PERMISSION_DENIED" as const,
      message:
        "Conexao SSH aberta, mas o servidor recusou a sessao SFTP. Ative SSH/SFTP no hPanel da Hostinger e confirme usuario/permissao de acesso remoto.",
    };
  }

  if (lowerMessage.includes("auth") || lowerMessage.includes("password")) {
    return {
      code: "SFTP_AUTHENTICATION_FAILED" as const,
      message: "Falha de autenticação SFTP. Verifique usuário, senha ou chave no servidor.",
    };
  }

  if (
    lowerMessage.includes("host denied") ||
    lowerMessage.includes("verification failed") ||
    lowerMessage.includes("host key")
  ) {
    return {
      code: "SFTP_CONNECTION_FAILED" as const,
      message:
        "Fingerprint SFTP invalido. Atualize SFTP_HOST_FINGERPRINT com a chave atual do servidor Hostinger.",
    };
  }

  if (
    lowerMessage.includes("timed out") ||
    lowerMessage.includes("timeout") ||
    lowerMessage.includes("econnrefused") ||
    lowerMessage.includes("econnreset") ||
    lowerMessage.includes("closed") ||
    lowerMessage.includes("handshake")
  ) {
    return {
      code: "SFTP_CONNECTION_FAILED" as const,
      message:
        "Falha ao conectar ao SFTP. Verifique host, porta, SSH/SFTP ativo e firewall. Na Hostinger, a porta SFTP costuma ser 65002.",
    };
  }

  return {
    code: "SFTP_CONNECTION_FAILED" as const,
    message: "Falha ao conectar ao SFTP. Verifique host, porta e acesso SSH/SFTP.",
  };
}

async function closeClientAfterFailedConnect(client: Client) {
  await Promise.race([
    client.end(),
    new Promise<void>((resolve) => {
      setTimeout(resolve, 1000);
    }),
  ]).catch(() => {});
}

async function connectWithTimeout(
  client: Client,
  connectOptions: ConnectOptions,
  timeoutMs: number,
) {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      client.connect(connectOptions),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new Error(`SFTP connection timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export async function connectSftp(config: SftpPublishConfig) {
  const client = new Client();
  const connectOptions: ConnectOptions = {
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    privateKey: config.privateKey,
    passphrase: config.privateKeyPassphrase,
    readyTimeout: config.readyTimeout,
  };

  if (config.hostFingerprint) {
    const expectedFingerprint = normalizeFingerprint(config.hostFingerprint);
    connectOptions.hostHash = "sha256";
    connectOptions.hostVerifier = (fingerprint) => {
      const actualFingerprint = normalizeFingerprint(String(fingerprint));
      const matched = actualFingerprint === expectedFingerprint;
      return matched;
    };
  }

  try {
    await connectWithTimeout(client, connectOptions, config.connectionTimeout);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao conectar via SFTP.";
    const deploymentError = getConnectionErrorMessage(message);
    await closeClientAfterFailedConnect(client);

    throw new DeploymentError(deploymentError.code, deploymentError.message);
  }

  return client;
}
