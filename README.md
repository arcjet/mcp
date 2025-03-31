<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Arcjet - MCP Server

<p>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/arcjet?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
    <img alt="npm badge" src="https://img.shields.io/npm/v/arcjet?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
  </picture>
</p>

[Arcjet](https://arcjet.com) helps developers protect their apps in just a few
lines of code. Bot detection. Rate limiting. Email validation. Attack
protection. Data redaction. A developer-first approach to security.

This is the Arcjet Model Context Protocol (MCP) server. It provides AI agents
with useful context that will help you integrate Arcjet into your application
and retrieve information from Arcjet about processed requests.

## Features

- List teams and sites.

## Setup

### Cursor

1. Clone this repository locally.
2. Run `npm install` and `npm run build`.
3. Open Cursor settings (Cmd+Shift+P > Cursor Settings) > MCP > Add new MCP
   server.
4. Add the following into the `mcp.json` file:

    ```json
    {
        "mcpServers": {
            "arcjet": {
                "command": "node",
                "args": [
                    "/PATH/TO/mcp/index.js"
                ],
                "env": {
                    "ARCJET_API_KEY": "YOUR_KEY_HERE"
                }
            }
        }
    }
    ```

    Replace `/PATH/TO/mcp/index.js` with the absolute path to `index.js` in this
    repo. For example, if you cloned the repository to your Downloads folder on
    macOS for the user `totoro` then this would be:
    `/Users/totoro/Downloads/mcp/index.js`

5. In the Cursor MCP settings, ensure the `arcjet` MCP server shows as enabled.

## Get help

[Join our Discord server]([discord-invite](https://arcjet.com/discord)) or
[reach out for support]([support](https://docs.arcjet.com/support)).
