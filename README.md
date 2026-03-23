<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Arcjet - MCP Server

[Arcjet](https://arcjet.com) is the runtime AI security platform that ships with
your code. Stop bots and automated attacks from burning your AI budget, leaking
data, or misusing tools with Arcjet's AI security building blocks.

This is the Arcjet [Model Context Protocol](https://modelcontextprotocol.io/)
(MCP) server. The server runs as an HTTP server MCP clients authenticate via
OAuth 2.0.

## Features

- **list-teams** — List all Arcjet teams the authenticated user belongs to.
- **list-sites** — List all Arcjet sites for a given team.
- **get-site-key** — Retrieve the SDK key for a site (used as `ARCJET_KEY` in
  your app).

## Running the server

1. Clone this repository.
2. Install dependencies and build:

   ```sh
   npm install && npm run build
   ```

3. Create a `.env` file:

   ```sh
   MCP_SERVER_URL=http://localhost:3000   # public URL of this server
   PORT=3000
   ```

4. Start the server:

   ```sh
   node index.js
   ```

   The server listens on `http://localhost:3000` by default. When deploying, set
   `MCP_SERVER_URL` to the public URL (e.g. `https://mcp.example.com`).

## Client setup

### VS Code (GitHub Copilot)

1. Enable MCP support in VS Code: set `chat.mcp.enabled` to `true` in Settings.
2. Create or update `.vscode/mcp.json` in your workspace:

   ```json
   {
     "servers": {
       "arcjet": {
         "type": "http",
         "url": "http://localhost:3000/mcp"
       }
     }
   }
   ```

3. Open the Chat view (`Ctrl+Alt+I` / `Cmd+Option+I`) and select **Agent mode**.
4. On first use, VS Code will prompt you to complete the Arcjet login flow.
5. Click **Tools** to confirm the Arcjet tools are available.

### Cursor

1. Open Cursor Settings → **MCP** → **Add new MCP server**.
2. Add the following to your `mcp.json`:

   ```json
   {
     "mcpServers": {
       "arcjet": {
         "url": "http://localhost:3000/mcp"
       }
     }
   }
   ```

3. Cursor will prompt you to authenticate to Arcjet on first use.
4. Confirm the `arcjet` MCP server shows as enabled in Cursor MCP settings.

### Claude Code

1. Add the server to your Claude Code MCP configuration. Run:

   ```sh
   claude mcp add --transport http arcjet http://localhost:3000/mcp
   ```

   Or add it manually to your Claude Code settings (`~/.claude/settings.json`
   for global, or `.claude/settings.json` for project-level):

   ```json
   {
     "mcpServers": {
       "arcjet": {
         "type": "http",
         "url": "http://localhost:3000/mcp"
       }
     }
   }
   ```

2. Claude Code will launch the Arcjet login flow the first time it connects.
3. The Arcjet tools will be available in your Claude Code session.

### ChatGPT

1. In [ChatGPT](https://chatgpt.com), go to **Settings** → **Connectors** →
   **Add connector**.
2. Select **MCP Server** and enter your server URL:

   ```
   http://localhost:3000/mcp
   ```

3. ChatGPT will redirect you to Arcjet to complete the login flow.
4. Once connected, the Arcjet tools are available in your chats.

> [!NOTE] For ChatGPT (and any remote use), the server must be reachable at a
> public URL. Replace `http://localhost:3000` with your deployed server URL and
> ensure `MCP_SERVER_URL` is set accordingly. |

## Get help

[Join our Discord server](https://arcjet.com/discord) or
[reach out for support](https://docs.arcjet.com/support).
