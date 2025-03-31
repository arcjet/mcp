import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { TypeID } from "typeid-js";
import { z } from "zod";

const ARCJET_MCP_VERSION = "1.0.0";

const ARCJET_API_BASE = "https://api.arcjet.com";
const ARCJET_API_KEY = process.env.ARCJET_API_KEY;
const USER_AGENT = `arcjet-mcp/${ARCJET_MCP_VERSION}`;

const server = new McpServer({
    name: "arcjet",
    version: ARCJET_MCP_VERSION,
    capabilities: {
        tools: {}
    },
});

async function makeArcjetAPIRequest<T>(url: string): Promise<T | null> {
    const headers = {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
        "Cookie": `session=${ARCJET_API_KEY}`,
    };

    try {
        const response = await fetch(url, { headers });
        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return (await response.json()) as T;
    } catch (error) {
        console.error("Error making Arcjet API request:", error);
        return null;
    }
}

interface Team {
    id: string;
    name: string;
    isDefault: boolean;
    isOwner: boolean;
    createdAt: string;
    updatedAt: string;
}

interface Site {
    id: string;
    name: string;
    teamId: string;
    createdAt: string;
    updatedAt: string;
}

async function listTeams(): Promise<Team[] | null> {
    const url = `${ARCJET_API_BASE}/v1/teams`;
    return makeArcjetAPIRequest<Team[]>(url);
}

async function listSites(teamId: string): Promise<Site[] | null> {
    const url = `${ARCJET_API_BASE}/v1/teams/${teamId}/sites`;
    return makeArcjetAPIRequest<Site[]>(url);
}

// Generic TypeID validator that can be used with any prefix
// https://github.com/jetify-com/typeid-js
const createTypeIdSchema = (prefix: string) => z.string().refine(
    (val) => {
        try {
            const parsed = TypeID.fromString(val);
            return parsed.getType() === prefix;
        } catch {
            return false;
        }
    },
    {
        message: `Invalid ID format. Must be a valid TypeID with '${prefix}' prefix`,
    }
);

server.tool(
    "list-teams",
    "List all Arcjet teams available to the user",
    {},
    async () => {
        const teams = await listTeams();

        if (!teams) {
            return {
                isError: true,
                content: [
                    {
                        type: "text",
                        text: "Failed to retrieve teams from Arcjet API.",
                    },
                ],
            };
        }

        if (teams.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No teams found for the current user.",
                    },
                ],
            };
        }

        const formatted = teams
            .map((team) => `• ${team.name} (ID: \`${team.id})\`${team.isDefault ? " [default]" : ""}`)
            .join("\n");

        return {
            content: [
                {
                    type: "text",
                    text: `Available teams:\n\n${formatted}`,
                },
            ],
        };
    },
);

server.tool(
    "list-sites",
    "List all Arcjet sites for a specific team",
    {
        teamId: createTypeIdSchema("team").describe("The ID of the team to list sites for"),
    },
    async ({ teamId }) => {
        const sites = await listSites(teamId);

        if (!sites) {
            return {
                isError: true,
                content: [
                    {
                        type: "text",
                        text: "Failed to retrieve sites from Arcjet API.",
                    },
                ],
            };
        }

        if (sites.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No sites found for the specified team.",
                    },
                ],
            };
        }

        const formatted = sites
            .map((site) => `• ${site.name} (ID: \`${site.id}\`)`)
            .join("\n");

        return {
            content: [
                {
                    type: "text",
                    text: `Available sites:\n\n${formatted}`,
                },
            ],
        };
    },
);

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Arcjet MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});