import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import {
  mcpAuthMetadataRouter,
  type AuthMetadataOptions,
} from "@modelcontextprotocol/sdk/server/auth/router.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { OAuthMetadata } from "@modelcontextprotocol/sdk/shared/auth.js";
import express from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { TypeID } from "typeid-js";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ARCJET_MCP_VERSION = "1.0.0";
const ARCJET_API_BASE = "https://api.arcjet.com";
const USER_AGENT = `arcjet-mcp/${ARCJET_MCP_VERSION}`;

const ARCJET_AUTH_DOMAIN =
  process.env.ARCJET_AUTH_DOMAIN ?? "https://auth.arcjet.com";

const MCP_SERVER_URL = process.env.MCP_SERVER_URL ?? "http://localhost:3000";
const PORT = Number(process.env.PORT ?? 3000);

// ---------------------------------------------------------------------------
// API Types
// ---------------------------------------------------------------------------

interface Team {
  id: string;
  name: string;
  isDefault?: boolean;
  isOwner?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Site {
  id: string;
  name: string;
  teamId: string;
  key: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// API Client
// ---------------------------------------------------------------------------

class ArcjetApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ArcjetApiError";
  }
}

class ArcjetApiClient {
  private readonly headers: Record<string, string>;

  constructor(accessToken: string) {
    this.headers = {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    };
  }

  private async get<T>(path: string): Promise<T> {
    const response = await fetch(`${ARCJET_API_BASE}${path}`, {
      headers: this.headers,
    });
    if (!response.ok) {
      throw new ArcjetApiError(
        `Arcjet API returned ${response.status} ${response.statusText}`,
        response.status,
      );
    }
    return response.json() as Promise<T>;
  }

  // GetTeams — GET /v1/teams
  getTeams(): Promise<Team[]> {
    return this.get<Team[]>("/v1/teams");
  }

  // GetTeamSites — GET /v1/teams/{teamId}/sites
  getTeamSites(teamId: string): Promise<Site[]> {
    return this.get<Site[]>(`/v1/teams/${teamId}/sites`);
  }

  // GetSite — GET /v1/sites/{siteId}
  getSite(siteId: string): Promise<Site> {
    return this.get<Site>(`/v1/sites/${siteId}`);
  }
}

// ---------------------------------------------------------------------------
// Input Validation
// ---------------------------------------------------------------------------

// Validates a TypeID string with a specific prefix
// https://github.com/jetify-com/typeid-js
const typeIdSchema = (prefix: string) =>
  z.string().refine(
    (val) => {
      try {
        return TypeID.fromString(val).getType() === prefix;
      } catch {
        return false;
      }
    },
    { message: `Must be a valid TypeID with '${prefix}' prefix` },
  );

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

function createMcpServer(api: ArcjetApiClient): McpServer {
  const server = new McpServer({
    name: "arcjet",
    version: ARCJET_MCP_VERSION,
  });

  server.tool(
    "list-teams",
    "List all Arcjet teams the authenticated user belongs to. Returns team names and IDs. Use the returned team IDs with list-sites.",
    {},
    async () => {
      try {
        const teams = await api.getTeams();

        if (teams.length === 0) {
          return { content: [{ type: "text", text: "No teams found." }] };
        }

        const lines = teams.map(
          (t) =>
            `• ${t.name} (ID: \`${t.id}\`)${t.isDefault ? " [default]" : ""}${t.isOwner ? " [owner]" : ""}`,
        );
        return {
          content: [{ type: "text", text: `Teams:\n\n${lines.join("\n")}` }],
        };
      } catch (err) {
        return {
          isError: true,
          content: [{ type: "text", text: String(err) }],
        };
      }
    },
  );

  server.tool(
    "list-sites",
    "List all Arcjet sites belonging to a team. Each site represents an application protected by Arcjet and has its own SDK key. Use get-site-key to retrieve the key for a specific site.",
    { teamId: typeIdSchema("team").describe("The team ID (from list-teams)") },
    async ({ teamId }) => {
      try {
        const sites = await api.getTeamSites(teamId);

        if (sites.length === 0) {
          return {
            content: [{ type: "text", text: "No sites found for this team." }],
          };
        }

        const lines = sites.map((s) => `• ${s.name} (ID: \`${s.id}\`)`);
        return {
          content: [{ type: "text", text: `Sites:\n\n${lines.join("\n")}` }],
        };
      } catch (err) {
        return {
          isError: true,
          content: [{ type: "text", text: String(err) }],
        };
      }
    },
  );

  server.tool(
    "get-site-key",
    "Get the SDK key for an Arcjet site. The SDK key is used to initialize the Arcjet SDK in your application code (ARCJET_KEY environment variable).",
    { siteId: typeIdSchema("site").describe("The site ID (from list-sites)") },
    async ({ siteId }) => {
      try {
        const site = await api.getSite(siteId);
        return {
          content: [
            {
              type: "text",
              text: `SDK key for ${site.name}: \`${site.key}\``,
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [{ type: "text", text: String(err) }],
        };
      }
    },
  );

  return server;
}

// ---------------------------------------------------------------------------
// Arcjet Token Verification
// ---------------------------------------------------------------------------

const JWKS = createRemoteJWKSet(new URL(`${ARCJET_AUTH_DOMAIN}/oauth2/jwks`));

const tokenVerifier = {
  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: ARCJET_AUTH_DOMAIN,
    });
    return {
      token,
      clientId: String(payload.sub ?? ""),
      scopes: (typeof payload["scope"] === "string" ? payload["scope"] : "")
        .split(" ")
        .filter(Boolean),
      expiresAt: payload.exp,
    };
  },
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Fetch Arcjet's OAuth metadata for the protected resource metadata endpoint
  const authMetadataRes = await fetch(
    `${ARCJET_AUTH_DOMAIN}/.well-known/oauth-authorization-server`,
  );
  if (!authMetadataRes.ok) {
    throw new Error(
      `Failed to fetch Arcjet OAuth metadata from ${authMetadataRes.url}: ${authMetadataRes.status}`,
    );
  }
  const oauthMetadata = (await authMetadataRes.json()) as OAuthMetadata;

  const resourceServerUrl = new URL(MCP_SERVER_URL);
  const resourceMetadataUrl = `${MCP_SERVER_URL}/.well-known/oauth-protected-resource`;

  // Restrict to the configured server hostname to prevent DNS rebinding attacks.
  const app = createMcpExpressApp({
    host: "0.0.0.0",
    allowedHosts: [resourceServerUrl.hostname],
  });

  // /.well-known/oauth-protected-resource
  // Directs MCP clients to Arcjet as the authorization server
  const authMetadataOptions: AuthMetadataOptions = {
    oauthMetadata,
    resourceServerUrl,
    resourceName: "Arcjet MCP Server",
    scopesSupported: ["openid", "profile", "email"],
  };
  app.use(mcpAuthMetadataRouter(authMetadataOptions));

  // /.well-known/oauth-authorization-server
  // Backwards compat proxy for clients that don't support Protected Resource Metadata
  app.get("/.well-known/oauth-authorization-server", async (_req, res) => {
    const upstream = await fetch(
      `${ARCJET_AUTH_DOMAIN}/.well-known/oauth-authorization-server`,
    );
    res.json(await upstream.json());
  });

  // POST /mcp — MCP Streamable HTTP endpoint, protected by Arcjet auth
  app.post(
    "/mcp",
    express.json(),
    requireBearerAuth({ verifier: tokenVerifier, resourceMetadataUrl }),
    async (req, res) => {
      const api = new ArcjetApiClient(res.locals.auth.token);
      const server = createMcpServer(api);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    },
  );

  app.listen(PORT, () => {
    console.error(`Arcjet MCP Server running on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
