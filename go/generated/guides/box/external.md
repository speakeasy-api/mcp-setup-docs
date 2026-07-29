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
[enable Box Doc Gen](#enable-doc-gen) if users need those tools. Their scopes
appear only after the corresponding feature is enabled. Then create
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

1. Hover over **Custom Box MCP Server**.
2. Click **Configure**.

If **Configuration** appears:

1. Open **Configuration**.
2. Click **Add Integration Credentials**.

If **Additional Configuration** appears instead:

1. Open **Additional Configuration**.
2. Click **+ Add Integration Credentials**.
3. Retain the pre-filled credential name or enter a new one.
4. Click **Save**.
5. Open the created credential entry.

<!-- screenshot: the Custom Box MCP Server configuration surface with either Configuration > Add Integration Credentials or Additional Configuration > + Add Integration Credentials visible, and the new credential entry it creates -->

### Set the Redirect URI {#set-redirect-uri}

Replace the existing value or values in **Redirect URIs** with
`{{ gram.oauth.callback_url }}`.

<!-- screenshot: the credential entry's Redirect URIs field containing the Speakeasy AI Control Plane callback URL -->

### Copy the Client ID and Client Secret {#copy-client-credentials}

Box does not document whether the Client Secret remains visible later. Copy
both values before leaving this flow.

1. Copy the **Client ID**.
2. Store the **Client ID** for
   [Speakeasy setup](speakeasy.md#connect-speakeasy-credentials).
3. Copy the **Client Secret**.
4. Store the **Client Secret** like a password for
   [Speakeasy setup](speakeasy.md#connect-speakeasy-credentials).

If you later cannot view the Client Secret, create and configure a new
credential entry.

<!-- screenshot-exception: the credential values are plain text fields whose appearance adds nothing beyond the copied values -->

### Check the Access scopes {#check-access-scopes}

1. Review **Access scopes**.
2. Select the options corresponding to the tool areas users need: Box content,
   Box AI, and Box Doc Gen.

The console's checkbox labels may differ from the API scope strings
`root_readwrite`, `ai.readwrite`, and `docgen.readwrite`.

The Doc Gen scope requires an Enterprise Advanced license. Scopes cap what the
connection can do; each user's existing Box permissions still limit the
content they can access.

If an AI or Doc Gen scope is absent, save the credential entry before leaving
the page. Enable the corresponding feature below, reopen the credential entry,
select the newly visible scope, and click **Save** again. If the saved entry
cannot be edited, create and configure a new credential entry.

<!-- screenshot: the credential entry's Access scopes section with its checkboxes visible; capture the exact labels because the documentation does not name them -->

### Save the credential entry {#save-credentials}

1. Click **Save**.
2. Reopen the credential entry.
3. Confirm that **Redirect URIs** contains the value you entered.

If the value did not persist, enter it again and click **Save**.

<!-- screenshot-exception: a standard button click with no unique state beyond the views captured in the prior steps -->

### Enable the Box AI API (AI tools only) {#enable-box-ai-api}

Complete this step only if users need Box AI tools. On Business, Business
Plus, and Enterprise plans, Box AI APIs require purchased Box AI Units.
Contact your Box account manager or `sales@box.com` to purchase them.

First-time enablement may require acceptance of the Box AI Product Addendum.
If **Review Agreement Offline** appears, contact the Box Account Team.

1. Open **Box AI** in the Admin Console.
2. Select **Settings**.
3. If Box AI is not fully enabled, click **Enable Box AI**.
4. For **Box AI APIs**, click **configure**.
5. Select **Enable for all**.

If you completed this prerequisite before creating credentials and users also
need Doc Gen tools, complete
[Enable Box Doc Gen](#enable-doc-gen) first unless it is already enabled.
Otherwise, continue at
[Find Custom Box MCP Server under Integrations](#find-custom-box-mcp-server).
If you came here because the Box AI scope was missing from a saved credential,
return to [Check the Access scopes](#check-access-scopes).

<!-- screenshot: the Box AI > Settings tab showing the Box AI APIs configuration set to Enable for all -->

### Enable Box Doc Gen (Doc Gen tools only) {#enable-doc-gen}

Complete this step only if users need Doc Gen tools. The Doc Gen scope requires
an Enterprise Advanced license.

1. Open **Enterprise Settings**.
2. Select **Content and Sharing**.
3. Scroll to **Box Doc Gen**.
4. Under **Box Doc Gen Permissions**, click **Configure**.
5. Select **Enable for all managed users**, **Enable for select users and
   groups**, or **Enable for everyone except select users and groups**.

The default is **Disable for all managed users (default)**.

If you completed this prerequisite before creating credentials and users also
need Box AI tools, complete
[Enable the Box AI API](#enable-box-ai-api) first unless it is already enabled.
Otherwise, continue at
[Find Custom Box MCP Server under Integrations](#find-custom-box-mcp-server).
If you came here because the Doc Gen scope was missing from a saved credential,
return to [Check the Access scopes](#check-access-scopes).

<!-- screenshot: Enterprise Settings > Content and Sharing scrolled to the Box Doc Gen section with its permissions options visible -->

### Restrict which tools are exposed (optional) {#manage-tool-access}

Complete this step before rollout if you need to restrict tools or enable the
external-sharing tools that are off by default. Changes apply across the
enterprise and take effect immediately.

1. Open the **Admin Console**.
2. Select **Integrations** in the left sidebar.
3. Select the **Box MCP Server** tab.
4. For a tool category, choose **Disable all tools**, **Enable read only
   tools**, **Enable read & write tools**, or **Custom configuration** from
   **Enablement**.

To control individual tools:

1. Click **Configure** for the category.
2. Set the toggles under **Read only MCP tools** and **Write MCP tools**.
3. Click **Save**.

If a client still shows the old tool list, refresh its tool list, start a new
chat, or disconnect and reconnect it.

<!-- screenshot: the Box MCP Server tab showing the category table with an Enablement dropdown open and its four options visible -->
