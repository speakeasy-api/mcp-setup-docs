# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select
   **Sources**.
2. Click **Add Source**.
3. Choose **3rd-party server**.
4. On the **MCP Catalog** page, enter `X` in **Search MCP servers...**.
5. Open the X entry with **View**.
6. Click **Add**.
7. In the **Add to Project** dialog, click **Add to Project**.

This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the X catalog entry or the Add to Project dialog; no credentials need redaction -->

### Connect your credentials {#connect-speakeasy-credentials}

No credential connection is required because the X documentation MCP Server
is public. Do not add an upstream header or attach an identity provider.

<!-- screenshot-exception: there is no credential form to complete for this open Authentication Option -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [X's MCP documentation](https://docs.x.com/tools/mcp).
