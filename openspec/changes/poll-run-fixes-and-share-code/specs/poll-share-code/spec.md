## ADDED Requirements

### Requirement: Poll owner can generate and copy a short share code
A poll owner SHALL be able to generate a short alphanumeric share code for their poll and copy it to the clipboard from the PollDetail page. The code is generated lazily — only on first request.

#### Scenario: Owner generates a code for the first time
- **WHEN** the poll owner clicks "Copy code" and `poll.shareCode` is null
- **THEN** the client calls `POST /api/polls/:id/share-code`
- **THEN** the server generates a unique 6-character alphanumeric code, saves it to `poll.shareCode`, and returns it
- **THEN** the code is copied to the clipboard
- **THEN** a toast displays "Code copied: <code>"

#### Scenario: Owner copies an existing code
- **WHEN** the poll owner clicks "Copy code" and `poll.shareCode` is already set
- **THEN** the existing code is copied to the clipboard without a server call
- **THEN** a toast displays "Code copied: <code>"

#### Scenario: Non-owner does not see Copy code button
- **WHEN** a non-owner views PollDetail
- **THEN** the "Copy code" button is not displayed

### Requirement: Share code resolves to poll template config
The system SHALL expose `GET /api/polls/by-code/:code` which returns the poll's template configuration. The response MUST NOT include run history, vote data, owner identity, or the poll's internal ID.

#### Scenario: Valid code returns template config
- **WHEN** a request is made to `GET /api/polls/by-code/abcd12`
- **AND** a poll with `shareCode === "abcd12"` exists
- **THEN** the response contains `question`, `channelId`, `guildId`, `liveTheme`, `resultTheme`, and `options`
- **THEN** the response does NOT contain `id`, `ownerId`, `runs`, or `status`

#### Scenario: Unknown code returns 404
- **WHEN** a request is made to `GET /api/polls/by-code/xxxxxx`
- **AND** no poll has that share code
- **THEN** the server responds with HTTP 404

### Requirement: Recipient can paste a share code to prefill the Create form
Any authenticated user SHALL be able to enter a share code via the "Paste from code" dialog on the Home page. On success the Create form SHALL open prefilled with the resolved template config and remain fully editable.

#### Scenario: Valid code prefills Create form
- **WHEN** the user opens the "Paste from code" dialog
- **AND** enters a valid 6-character share code and submits
- **THEN** `GET /api/polls/by-code/:code` is called
- **THEN** the user is navigated to `/poll/new` with the template config as router state
- **THEN** the Create form is prefilled with question, channelId, guildId, themes, and options from the config
- **THEN** all fields remain editable before the user submits

#### Scenario: Invalid code shows error
- **WHEN** the user submits a code that resolves to a 404
- **THEN** an inline error is shown in the dialog ("Code not found")
- **THEN** the user remains on the dialog to try again

#### Scenario: Import by ID is no longer available
- **WHEN** the user opens the Home page
- **THEN** there is no "Import by ID" dialog or button
- **THEN** the only code-based import entry point is "Paste from code"
