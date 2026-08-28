---
setup_version: 1
---

# Box

You need a Box Admin or Co-Admin account for the enterprise you are
connecting.

The Box MCP Server is available on all Box plans, but its tools depend on
your plan. Box AI tools require an eligible Box AI plan or purchased Box AI
Units. The Doc Gen scope requires an Enterprise Advanced license. Box meters
and bills API calls made with the Integration Credentials created below.

### Sign in to the Box Admin Console {#open-admin-console}

Sign in to the **Box Admin Console** at
[app.box.com/master](https://app.box.com/master) with your Box Admin or
Co-Admin account.

<!-- screenshot-exception: a sign-in page with no MCP-specific state; the Integrations view is captured in the next step -->

Before creating credentials, [enable Box AI](#enable-box-ai-api) or
[enable Box Doc Gen](#enable-doc-gen) if users need those tools. Then create
credentials for the **Custom Box MCP Server** integration.

### Find Custom Box MCP Server under Integrations {#find-custom-box-mcp-server}

1. Select **Integrations**.
2. Apply the **MCP Category** filter, or type `Custom Box MCP Server` in the
   search bar at the top of the page.
3. Find the **Custom Box MCP Server** tile.

Do not select the **Box MCP Server** tab or a named partner tile.

<!-- screenshot: the Integrations page with the MCP Category filter applied, or Custom Box MCP Server in the search bar, and the Custom Box MCP Server tile visible -->

### Add Integration Credentials {#add-integration-credentials}

If **Configuration** appears:

1. Open **Configuration**.
2. Click **Add Integration Credentials**.

If **Additional Configuration** appears instead:

1. Hover over **Custom Box MCP Server**.
2. Click **Configure**.
3. Open **Additional Configuration**.
4. Click **+ Add Integration Credentials**.
5. Retain the pre-filled credential name or enter a new one.
6. Click **Save**.
7. Open the created credential entry.

<!-- screenshot: the visible credential-add control on whichever documented configuration surface the enterprise presents -->

### Set the Redirect URI {#set-redirect-uri}

Replace the existing value or values in **Redirect URIs** with this value:

```
{{ gram.oauth.callback_url }}
```

<!-- screenshot: the credential entry's Redirect URIs field containing the Speakeasy AI Control Plane callback URL, with surrounding tenant and credential details redacted -->

### Copy the Client ID and Client Secret {#copy-client-credentials}

Copy both values while Box shows them.

1. Copy the **Client ID**.
2. Store the **Client ID** for
   [Speakeasy setup](speakeasy.md#connect-speakeasy-credentials).
3. Copy the **Client Secret**.
4. Store the **Client Secret** like a password for
   [Speakeasy setup](speakeasy.md#connect-speakeasy-credentials).

<!-- screenshot-exception: the unique content is secret-bearing text; omit the screenshot unless every credential value is redacted -->

### Check the Access scopes {#check-access-scopes}

1. Review **Access scopes**.
2. Select the options corresponding to the tool areas users need.

Select Box AI or Box Doc Gen access only when the enterprise has enabled and
licensed those features. The Doc Gen scope requires an Enterprise Advanced
license. Scopes cap what the connection can do; each user's existing Box
permissions still limit the content they can access.

<!-- screenshot: the credential entry's Access scopes section with the intended non-secret selections visible and all credential values redacted; capture the exact labels because the documentation does not name them -->

### Save the credential entry {#save-credentials}

Save the integration credentials.

<!-- screenshot-exception: a standard button click with no unique state beyond the views captured in the prior steps -->

### Enable the Box AI API (AI tools only) {#enable-box-ai-api}

Complete this step only if users need Box AI tools. Box AI APIs require an
eligible Box AI plan or purchased Box AI Units. If the setting is unavailable,
resolve the enterprise's Box AI entitlement before continuing.

1. Open **Box AI** in the Admin Console.
2. Select **Settings**.
3. Enable **Enable AI API**.

Then return to [Find Custom Box MCP Server under Integrations](#find-custom-box-mcp-server).

<!-- screenshot: Box AI > Settings with Enable AI API visible; do not show user or tenant identifiers -->

### Enable Box Doc Gen (Doc Gen tools only) {#enable-doc-gen}

Complete this step only if users need Doc Gen tools. The Doc Gen scope requires
an Enterprise Advanced license.

1. Open **Enterprise Settings**.
2. Select **Content and Sharing**.
3. Scroll to **Box Doc Gen**.
4. Under **Box Doc Gen Permissions**, choose to enable Doc Gen for all managed
   users, selected users and groups, or everyone except selected users and
   groups.

By default, Doc Gen is disabled for all managed users.

Then return to [Find Custom Box MCP Server under Integrations](#find-custom-box-mcp-server).

<!-- screenshot: Enterprise Settings > Content and Sharing scrolled to Box Doc Gen with the permissions control visible and identities redacted -->

### Manage tool access before rollout (optional) {#manage-tool-access}

Complete this step only when enterprise policy requires restrictions or when
you must enable an external-sharing tool that Box disables by default. Changes
apply across the enterprise.

1. Open the **Admin Console**.
2. Select **Integrations**.
3. Select the **Box MCP Server** tab.
4. For a tool category, choose **Disable all tools**, **Enable read only
   tools**, **Enable read & write tools**, or **Custom configuration** from
   **Enablement**.

To control individual tools:

1. Click **Configure** for the category.
2. Set the toggles under **Read only MCP tools** and **Write MCP tools**.
3. Click **Save**.

File preview requires a compatible application. Upload and download URL
tools require an application that can make network requests; a cloud security
owner may also need to allowlist domains.

If a client still shows the old tool list, refresh its tool list, start a new
chat, or disconnect and reconnect it.

<!-- screenshot: the Box MCP Server tab showing the category table with an Enablement dropdown open and its four options visible -->
