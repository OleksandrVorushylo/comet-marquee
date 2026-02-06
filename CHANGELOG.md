# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Vertical Scrolling**: Added `vertical` option for top-to-bottom or bottom-to-top scrolling.
- **Full Width Mode**: Added `fullWidth` option to stretch container to viewport width.
- **JSDoc Documentation**: Complete JSDoc coverage for all methods and options in `src/index.js`, improving IDE intellisense.
- **CSS Customization**: Added `--comet-marquee-height` variable support for vertical mode control.

### Changed
- **ResizeObserver Protection**: Implemented an 8-layer protection system against infinite loops in `ResizeObserver`, ensuring stability in complex layouts.
- **README**: Updated documentation with comprehensive options table, vertical/full-width examples, and CSS customization guide.
- **Code Styles**: Converted all inline comments to JSDoc format for better readability and maintenance.

### Fixed
- Fixed potential infinite loop issues where `ResizeObserver` could trigger rapid re-renders.
- Fixed race conditions in `resume` and `init` methods that could cause animation glitches.
- Fixed missing options in TypeScript/JSDoc definitions (`fullWidth`, `vertical`, `height`).

## [1.1.28] - 2024-XX-XX
- Maintenance release with stability improvements.
