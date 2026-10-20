# Changelog

All notable changes to AI Provider Spend are listed here.

## [Unreleased]

### Added

- DeepSeek spend, read from the DeepSeek dashboard with a dashboard token that you paste in Settings.

### Changed

- Each provider is now one module that declares how the app gets its spend data, so adding a provider takes one new file, one entry in the provider list, and one value in the provider id enum.

### Fixed

- The Claude Code usage card no longer fails when the usage response has no extra usage credits.

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
