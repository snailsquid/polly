## ADDED Requirements

### Requirement: Results page can start a new run directly
The Results page SHALL provide a "Start Another Run" action that creates a new `PollRun` and navigates to the live view, without requiring the user to navigate to the edit page first.

#### Scenario: Owner starts a new run from Results
- **WHEN** the poll owner is on the Results page for an ENDED poll
- **AND** there is no currently LIVE run
- **AND** the owner clicks "Start Another Run"
- **THEN** a new `PollRun` is created via `POST /api/polls/:id/start`
- **THEN** the user is navigated to `/poll/:id/live`

#### Scenario: Non-owner does not see Start Another Run
- **WHEN** a non-owner views the Results page
- **THEN** the "Start Another Run" button is not displayed

#### Scenario: Start Another Run is disabled while a run is live
- **WHEN** the poll already has a LIVE run
- **THEN** the "Start Another Run" button is not displayed on the Results page

### Requirement: Ending a live poll offers restart from live view
After a poll run ends, the live view SHALL navigate to the Results page (not the edit page), so the owner can immediately review results and choose to restart.

#### Scenario: Owner manually ends a poll
- **WHEN** the owner clicks "End Live" on the live poll page
- **THEN** after the run is successfully ended, the user is navigated to `/poll/:id/results`

#### Scenario: Poll auto-ends via timer
- **WHEN** a timed poll's countdown reaches zero
- **THEN** the live page navigates to `/poll/:id/results`
