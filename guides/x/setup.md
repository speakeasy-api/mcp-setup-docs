---
setup_version: 1
---

# Connect X to the Speakeasy AI Control Plane

## Prerequisites

Before you begin, obtain:

- An X account that can enroll in the X Developer Platform and accept the Developer Agreement and Policy.
- Authority to create an X developer app.
- Organization-approved wording for the app name, description, and API use case.
- Access to your organization's password manager or secure vault.
- API credits available through the billing and credits area of the [**Developer Console**](https://console.x.com). API requests are blocked when the credit balance is zero or negative.

This setup provides read-only access to public data. It cannot act as a user or perform writes.

## Provider setup

### Enroll in the X Developer Platform {#enroll-developer-account}

1. Go to [console.x.com](https://console.x.com).
2. Sign in with the X account that will own the developer app.
3. If prompted, review and accept the Developer Agreement and Policy.
4. Provide the requested information about how your organization will use the API. Obtain the wording from the application or cloud security owner if needed.
5. Complete the remaining enrollment steps shown in the console.

Successful enrollment opens the **Developer Console** dashboard. Confirm that **New App** is visible.

<!-- screenshot: the Developer Console dashboard after enrollment, with New App visible and account identifiers excluded -->

### Create an X app {#create-x-app}

1. On the **Developer Console** dashboard, select **New App**.
2. Enter the organization-approved app name, description, and use case.

> Before you submit the form, open your organization's password manager or secure vault. X displays generated credentials once.

3. Submit the form using the create control shown in the console.

X creates the app and displays its credentials, including the **Bearer Token**.

<!-- screenshot: the new-app form showing the app name, description, and use-case fields, with organization details redacted if necessary -->

### Copy the Bearer Token {#copy-bearer-token}

Copy **Bearer Token** from the generated credential view into your organization's password manager or secure vault before leaving the page.

<!-- screenshot-exception: the only useful state contains a live secret; do not capture the credential value -->

## Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Select **Add Source**.

If X appears in the catalog:

1. Select **3rd-party server**.
2. On the **MCP Catalog** page, enter `X` in **Search MCP servers...**.
3. Select **View** for X.
4. Select **Add**.

If the **Add to Project** dialog requests headers during installation, configure its **Upstream headers** section before continuing. Follow steps 3–6 under [Connect your credentials](#connect-speakeasy-credentials).

5. In the **Add to Project** dialog, select **Add to Project**.

If X does not appear in the catalog:

1. Select **Custom remote server**.
2. On **Add a custom remote MCP server**, paste `https://api.x.com/mcp` into **Remote MCP server URL**.
3. Confirm that the read-only **Transport** field shows `streamable-http`.
4. Select **Add server**.

Either path creates the hosted MCP Server and opens its **Overview** page.

<!-- screenshot: the Add Source menu or the X catalog entry, without credentials -->

### Connect your credentials {#connect-speakeasy-credentials}

If you configured headers in the **Add to Project** dialog, skip this section. Otherwise, from the server's **Overview** page:

1. Open **Settings**.
2. Under **Upstream Headers**, select **Add header**.
3. Enter `Authorization` in **Header name**.
4. Leave **Value source** set to **Static value**.
5. In the value field, enter `Bearer ` followed by the [**Bearer Token**](#copy-bearer-token) you saved.
6. Select **Secret**.
7. Select **Save**.

<!-- screenshot: the Upstream Headers editor with Authorization, Static value, and Secret visible, with the value redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [X's MCP documentation](https://x-preview.mintlify.app/tools/mcp).
