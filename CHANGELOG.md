# Changelog

All notable changes to AI Provider Spend are listed here.

## [0.1.1] - 2026-10-19

### Fixed

- Fixed the launch crash on Apple Silicon caused by ad hoc signing with hardened runtime.
- The Intel build is now signed ad hoc too.

### Changed

- The usage request reads the installed Claude Code version for its user agent.
- Cleaned up the repo. The tsbuildinfo files are no longer tracked, and the app id matches the build config.

## [0.1.0] - 2026-07-16

### Added

- First release.
- A menu bar app for tracking AI provider spend through the Anthropic and OpenAI Admin APIs.
- Claude Code plan usage: session %, weekly %, per model limits, and reset times.
- macOS builds for Apple Silicon and Intel.

Scaffolded from guasam/electron-react-app.
