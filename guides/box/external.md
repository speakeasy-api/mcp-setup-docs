---
setup_version: 1
---

# Box

Use a Box Admin or Co-Admin account for the enterprise you are connecting.
Sign in to the **Box Admin Console** at
[app.box.com/master](https://app.box.com/master).

The Box MCP Server is available on all Box plans, but its tools depend on
your plan. Box AI tools require a Box AI-enabled plan. The Doc Gen scope
requires an Enterprise Advanced license. Box meters and bills API calls made
with the Integration Credentials created below.

Before creating credentials, [enable Box AI](#enable-box-ai-api) or
[enable Box Doc Gen](#enable-doc-gen) if users need those tools. Then create
credentials for the **Custom Box MCP Server** integration.

### Sign in to the Box Admin Console {#open-admin-console}

Sign in to the **Box Admin Console** at
[app.box.com/master](https://app.box.com/master) with your Box Admin or
Co-Admin account.

<!-- screenshot-exception: a sign-in page with no MCP-specific state; the Admin Console landing view is captured in the next step -->

### Find Custom Box MCP Server under Integrations {#find-custom-box-mcp-server}

1. Select **Integrations**.
2. Apply the **MCP Category** filter, or type `Custom Box MCP Server` in the
   search bar at the top of the page.
3. Find the **Custom Box MCP Server** tile.

Do not select the **Box MCP Server** tab or a named partner tile.

<!-- screenshot: the Integrations page with the MCP Category filter applied, or Custom Box MCP Server in the search bar, and the Custom Box MCP Server tile visible -->

### Add Integration Credentials {#add-integration-credentials}

Complete the credential entry through **Save** in one sitting.

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

<!-- screenshot: the Custom Box MCP Server configuration surface with either Configuration > Add Integration Credentials or Additional Configuration > + Add Integration Credentials visible, and the new credential entry it creates -->

### Set the Redirect URI {#set-redirect-uri}

Replace the existing value or values in **Redirect URIs** with this value:

```
{{ gram.oauth.callback_url }}
```

<!-- screenshot: the credential entry's Redirect URIs field containing the Speakeasy AI Control Plane callback URL -->

### Copy the Client ID and Client Secret {#copy-client-credentials}

Copy both values while Box shows them.

1. Copy the **Client ID**.
2. Store the **Client ID** for
   [Speakeasy setup](speakeasy.md#connect-speakeasy-credentials).
3. Copy the **Client Secret**.
4. Store the **Client Secret** like a password for
   [Speakeasy setup](speakeasy.md#connect-speakeasy-credentials).

<!-- screenshot-exception: the unique content is secret-bearing text; omit the screenshot rather than expose credentials -->

### Check the Access scopes {#check-access-scopes}

1. Review **Access scopes**.
2. Select the options corresponding to the tool areas users need.

Select Box AI or Box Doc Gen access only when the enterprise has enabled and
licensed those features. The Doc Gen scope requires an Enterprise Advanced
license. Scopes cap what the connection can do; each user's existing Box
permissions still limit the content they can access.

<!-- screenshot: the credential entry's Access scopes section with its checkboxes visible; capture the exact labels because the documentation does not name them -->

### Save the credential entry {#save-credentials}

If you used **Configuration**, click **Save**. If you used **Additional
Configuration**, use the submission control shown for the edited credential
entry.

<!-- screenshot-exception: a standard button click with no unique state beyond the views captured in the prior steps -->

### Enable the Box AI API (AI tools only) {#enable-box-ai-api}

Complete this step only if users need Box AI tools. Box AI APIs require an
eligible Box AI plan or purchased Box AI Units. If the setting is unavailable,
resolve the enterprise's Box AI entitlement before continuing.

1. Open **Box AI** in the Admin Console.
2. Select **Settings**.
3. Enable **Enable AI API**.

<!-- screenshot: Box AI > Settings with Enable AI API visible -->

### Enable Box Doc Gen (Doc Gen tools only) {#enable-doc-gen}

Complete this step only if users need Doc Gen tools. The Doc Gen scope requires
an Enterprise Advanced license.

1. Open **Enterprise Settings**.
2. Select **Content and Sharing**.
3. Scroll to **Box Doc Gen**.
4. Under **Box Doc Gen Permissions**, select **Enable for all managed users**,
   **Enable for select users and groups**, or **Enable for everyone except
   select users and groups**.

The default is **Disable for all managed users (default)**.

<!-- screenshot: Enterprise Settings > Content and Sharing scrolled to the Box Doc Gen section with its permissions options visible -->

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

File preview requires a client with MCP Apps support. Upload and download URL
tools require an agentic client that can make network requests and may require
domain allowlisting.

If a client still shows the old tool list, refresh its tool list, start a new
chat, or disconnect and reconnect it.

<!-- screenshot: the Box MCP Server tab showing the category table with an Enablement dropdown open and its four options visible -->
