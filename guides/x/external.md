---
setup_version: 1
---

# Connect X to the Speakeasy AI Control Plane

Before you begin, obtain:

- An X account that can enroll in the X Developer Platform and accept the Developer Agreement and Policy.
- Authority to create an X developer app.
- Organization-approved wording for the app name, description, and API use case.
- Access to your organization's password manager or secure vault.
- API credits available through the billing and credits area of the [**Developer Console**](https://console.x.com). X API usage is pay-per-usage and is charged through the developer account that owns the app. API requests are blocked when the credit balance is zero or negative.

This setup provides read-only access to public data. It cannot act as a user or perform writes.

### Enroll in the X Developer Platform {#enroll-developer-account}

1. Go to [console.x.com](https://console.x.com).
2. Sign in with the X account that will own the developer app.
3. If prompted, review the Developer Agreement and Policy.
4. If prompted, accept the Developer Agreement and Policy.
5. Provide the requested information about how your organization will use the API. Obtain the wording from the application or cloud security owner if needed.
6. Complete the remaining enrollment steps shown in the console.

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

If you closed the credential view before saving the token:

1. Reopen the app from the **Developer Console** dashboard.
2. Open **Keys and tokens**.

> **Regenerate** replaces the existing Bearer Token. Have your organization's password manager or secure vault ready before continuing.

3. Select **Regenerate** for the **Bearer Token**.
4. Save the newly displayed token before leaving the view.

<!-- screenshot-exception: the only useful state contains a live secret; do not capture the credential value -->
