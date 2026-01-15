# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.6] - 2026-01-15

### Added

- **MCP Server Instructions**: Added comprehensive server-level instructions following the Model Context Protocol specification
  - Documents critical workflow: sharpen → start → poll → get report
  - Explains mode selection (quick, standard, deep, research)
  - Details phase constraints and progression
  - Lists support tools and their purposes
  - Helps AI clients understand optimal usage patterns

- **Evidence Scoring Tool** (`score_evidence_pack`):
  - Score evidence coverage and credibility before running analysis
  - Returns overall score with breakdown by coverage, credibility, and relevance
  - Identifies gaps in evidence
  - Provides recommendations for improvement

- **Decision Template Tools**:
  - `list_decision_templates`: List available decision templates for the workspace
  - `use_decision_template`: Instantiate templates with user-provided variables
  - Supports both workspace-specific and public templates
  - Returns fully instantiated questions ready for consultation

### Changed

- Updated server version to 0.2.6 to maintain version consistency

## [0.2.5] - 2026-01-13

### Added

- Enhanced `start_consultation` with new parameters:
  - `counsel_id`: Custom identifier for consultations
  - `debate_mode`: Execution control (sync/async/background)
  - `max_budget_cents`: Cost limits for analysis

### Changed

- Made `enable_mcda` and `stake_level` optional parameters in `start_consultation`

## [0.2.4] - 2026-01-11

### Added

- Research artifact retrieval tools:
  - `retrieve_research_artifact`: On-demand retrieval of full research artifacts
  - `list_research_artifacts`: Lists available artifacts with metadata

### Changed

- Updated `manage_consultation` description with comprehensive phase constraint documentation

## [0.2.3] - 2026-01-11

### Added

- Multi-agent research patterns for deep research mode

## [0.2.2] - 2026-01-11

### Added

- Multi-agent research patterns support

## [0.2.1] - 2026-01-11

### Changed

- Improved deep research provider descriptions and added timeout handling

## [0.2.0] - 2026-01-10

### Added

- MCDA (Multi-Criteria Decision Analysis) scoring support
- Deep research mode with web research capabilities
- Multi-turn advisor sessions with profile management

## [0.1.6] - 2026-01-09

### Changed

- Updated Node.js version requirement to v20+ for undici compatibility

## [0.1.5] - 2026-01-09

### Fixed

- CI pipeline failure by installing ESLint dependencies and configuration

## [0.1.4] - 2026-01-09

### Added

- MSKS (Multi-Stakeholder) parameters to `start_consultation`
