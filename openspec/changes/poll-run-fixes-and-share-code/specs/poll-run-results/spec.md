## ADDED Requirements

### Requirement: Results page shows votes for a single selected run
The Results page SHALL display vote counts and percentages scoped to one selected `PollRun`, not aggregated across all runs.

#### Scenario: Single run poll shows results normally
- **WHEN** a poll has exactly one ENDED run
- **THEN** the Results page displays that run's votes with no run selector visible

#### Scenario: Multi-run poll shows run picker defaulting to latest
- **WHEN** a poll has two or more ENDED runs
- **THEN** a run selector dropdown is displayed, defaulting to the highest `runNumber` (latest)
- **THEN** votes shown are only from the selected run

#### Scenario: User selects a different run
- **WHEN** the user changes the run selector to a different run
- **THEN** the vote counts and chart update immediately to reflect that run's votes
- **THEN** the total vote count updates to that run's total

### Requirement: WebSocket vote updates apply to the current live run only
The WebSocket `poll:update` handler SHALL identify the live run by `status === 'LIVE'` rather than by array index, so that restarted polls receive votes on the correct run.

#### Scenario: Vote arrives for Run 2 after Run 1 ended
- **WHEN** a poll has Run 1 (ENDED) and Run 2 (LIVE)
- **AND** a Discord vote message arrives
- **AND** the server broadcasts a `poll:update` WS event
- **THEN** the live display shows Run 2's votes, not Run 1's

#### Scenario: First restart shows zero votes until first vote
- **WHEN** a new run is started on a previously-ended poll
- **AND** no votes have been cast yet on the new run
- **THEN** all vote counts display as 0 on the live page
