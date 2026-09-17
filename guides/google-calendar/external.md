---
setup_version: 1
---

# Google Calendar setup

Use a Google Workspace account and an existing Google Cloud project registered for the Google Workspace Developer Preview Program. Obtain the project from its owner. Sign in to the [Google Cloud console](https://console.cloud.google.com/flows/enableapi?apiid=calendar-json.googleapis.com) with your setup account.

You need **Service Usage Admin**, or the `serviceusage.services.enable` permission, on that project to enable the services. You need **OAuth Config Editor** to configure the OAuth application and client. Google marks this role **Beta**. If you lack these permissions, ask the project access administrator for them. An authorized organization representative must accept the applicable terms.

This guide gives read and availability access, not write access. Keep the preview application private. Limit users to your company or domain unless Google grants the exception specified in the preview terms. The **External** audience does not remove this limit. Do not publish the application.

### Confirm preview access {#confirm-preview-access}

1. Ask the project owner for Google's final preview registration email for the selected project.
2. If the project is not registered, ask an authorized organization representative to open [developers.google.com/workspace/preview](https://developers.google.com/workspace/preview).
3. Have the representative read the **Developer Preview Program Terms**.
4. Have the representative open the application form under **How to join the program**.
5. Have the representative enter the Workspace account and existing Cloud project information from their owners.
6. Make sure the registration email account can be added to Google Groups.
7. Have the representative submit the application if they agree to the terms.
8. Wait for Google's final project registration email before you continue. Account verification alone does not confirm project registration.

If you need additional account or project registrations, request them through the preview program. Do not assume that each user must submit a separate application.

<!-- screenshot: Show the preview program application links. -->

### Prepare security screening {#prepare-security-screening}

1. Ask the application or security owner to provide an organization-owned solution that screens MCP prompts and responses for malicious content and prompt injection.
2. Ask the owner to document the solution so users can accept the risk.
3. Make sure the screening is in operation and users can accept the documented risk before connection or use.

Do not continue without this prerequisite. These steps do not establish a screening feature in the Speakeasy AI Control Plane.

<!-- screenshot-exception: The organization-owned implementation has no common provider screen. -->

### Enable the Calendar services {#enable-calendar-services}

1. Open [console.cloud.google.com/flows/enableapi?apiid=calendar-json.googleapis.com](https://console.cloud.google.com/flows/enableapi?apiid=calendar-json.googleapis.com).
2. Select the registered project.
3. Enable **Google Calendar API** with the service enablement control.
4. Open [console.cloud.google.com/flows/enableapi?apiid=calendarmcp.googleapis.com](https://console.cloud.google.com/flows/enableapi?apiid=calendarmcp.googleapis.com).
5. Select the same registered project.
6. Enable **Google Calendar MCP API** with the service enablement control.

<!-- screenshot: Show the selected project and the API enablement page. -->

### Configure the OAuth application {#configure-oauth-application}

Obtain the support email, contact email, and permitted test-user email addresses from the application owner.

**Warning:** For an **External** application in **Testing**, refresh tokens expire after seven days. Automatic token refresh does not remove this limit. Another sign-in will be necessary. Do not publish the preview application to remove the limit.

For a new configuration:

1. In the Google Cloud console, open **Google Auth Platform > Branding** for the registered project.
2. Select **Get Started**.
3. Under **App Information**, enter `Calendar MCP Server` in **App name**.
4. Select the approved email address or Google group in **User support email**.
5. Select **Next**.
6. Under **Audience**, select **Internal** if your organization is eligible and the option is available. Otherwise, select **External** and keep the application in **Testing**.
7. Select **Next**.
8. Under **Contact Information**, enter the approved contact address in **Email address**.
9. Select **Next**.
10. Under **Finish**, read the linked Google API Services User Data Policy.
11. If you are authorized and agree, select **I agree to the Google API Services: User Data Policy**. Otherwise, ask an authorized representative to complete this action.
12. Select **Continue**.
13. Select **Create**.

For an existing configuration, use **Google Auth Platform > Branding**, **Audience**, and **Data Access** to confirm these settings.

For an **External** application:

1. Open **Audience**.
2. Under **Test users**, select **Add users**.
3. Enter your email address and the other permitted test-user addresses.
4. Select **Save**.

Add the required scopes:

1. Open **Data Access > Add or Remove Scopes**.
2. Under **Manually add scopes**, enter these three values as separate scopes:

   ```text
   https://www.googleapis.com/auth/calendar.calendarlist.readonly
   https://www.googleapis.com/auth/calendar.events.freebusy
   https://www.googleapis.com/auth/calendar.events.readonly
   ```

3. Use the available confirmation controls to save the scope selection.

<!-- screenshot: Show Google Auth Platform Audience and Data Access with the selected scopes. -->

### Create the OAuth client {#create-oauth-client}

1. Open **Google Auth Platform > Clients > Create Client** in the same project.
2. Select **Web application** as the application type.
3. Enter an application **Name** that identifies this Calendar connection.
4. Under **Authorized redirect URIs**, select **+ Add URI**.
5. Enter this callback value:

   ```text
   {{ gram.oauth.callback_url }}
   ```

6. Select **Create**.
7. Copy the **Client ID** to your approved secure storage.
8. Copy the **Client Secret** to your approved secure storage.

Keep the secret private. You will use both values in [Speakeasy setup](speakeasy.md#connect-speakeasy-credentials).

<!-- screenshot: Show the Web application client and Authorized redirect URIs. Hide all secrets. -->

### Confirm user access {#confirm-user-access}

Use an eligible **Internal** account or an assigned **External** test-user account. Each user must give Google consent during [client setup](speakeasy.md#connect-speakeasy-credentials). The user's Calendar permissions still apply. Cloud roles, OAuth scopes, and application approval do not replace calendar access.

If Calendar is off for managed trial users, ask a Workspace administrator with the **Calendar administrator privilege** to complete these actions:

1. In the Google Admin console, open **Apps > Google Workspace > Calendar > Service status**.
2. Select the trial users' organizational unit or access group.
3. Set the service status to **On**.
4. Select **Override** or **Save**, as the inherited setting requires.

If Workspace application controls block the application, ask a Workspace administrator with the **Service Settings administrator privilege** to complete these actions. Obtain the permitted organizational units and access settings from that administrator.

1. In the Google Admin console, open **Security > Access and data control > API controls**.
2. Select **Manage App Access**.
3. Under **Configured apps**, select **Configure new app**.
4. Enter the [Client ID](external.md#create-oauth-client).
5. Select **Search**.
6. Select the application.
7. Under **Scope**, select the permitted organizational units.
8. Select **Continue**.
9. Under **Access to Google data**, select the setting approved by your organization. Use **Specific Google data** to limit access to approved scopes, including the three [Calendar scopes](external.md#configure-oauth-application). Include any Google Sign-in scopes required by the application.
10. Select **Continue**.
11. Review the settings.
12. Select **Finish**.

Do not change application controls if the current policy already permits access. Do not select organization-wide **Trusted** access as a default.

If the trial needs a shared calendar that the user cannot access, ask its owner to complete these actions in Google Calendar on a computer. A person who is not the owner needs **Make changes and manage sharing** permission.

1. Under **My calendars**, open the calendar's **More > Settings and sharing**.
2. Select **Shared with > Add people and groups**.
3. Enter the connecting user's Google account email address.
4. Select **See event details** if the trial needs event details. Select **See only free/busy (hide details)** only if availability access is sufficient.
5. Select **Send**.
6. Ask the connecting user to open the link in the invitation email to add the calendar.

Do not make the calendar public for this trial. Access can stop if a user revokes consent, an administrator blocks access, or Google token limits apply. Internal applications do not have a guaranteed permanent token lifetime.

<!-- screenshot: Show Workspace application controls or calendar sharing. Hide private values. -->
