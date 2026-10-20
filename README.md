# AI Provider Spend

[English](README.md) | [简体中文](README.cn.md)

<p align="center"><em>A macOS menu-bar app that keeps your AI spend and Claude Code plan usage one click away.</em></p>

<p align="center">
  <img src="docs/ai-provider-usage.gif" alt="AI Provider Spend demo" width="680">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-47848F?style=flat&logo=electron&logoColor=white" alt="Electron">
  <img src="https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT">
</p>

## What Is This

Are you like me — constantly alt-tabbing over to claude.ai just to check how much of your session you've burned through? I built this so I wouldn't have to.

AI Provider Spend lives in your macOS menu bar and answers two questions you'd otherwise have to open three different dashboards for:

- **"How much of my Claude Code plan have I used?"** — one click away instead of a browser tab. Shows the exact same 5-hour session %, weekly %, per-model scoped limits (e.g. a specific model's weekly cap), and reset countdowns that claude.ai's own Settings → Usage page shows, sourced straight from Anthropic's usage endpoint using Claude Code's own local login — no extra setup required.
- **"How much have I spent on AI APIs this month?"** — pulls billing data from each provider's Admin API (Anthropic, OpenAI) or dashboard (DeepSeek); Google Gemini support is pending Cloud Billing export.

Everything renders in a lightweight popover anchored to the tray icon. No dock icon, no full app window, no accounts to create — just the numbers, right where you already are.

## Download

Grab the latest build from the [Releases page](https://github.com/justanotherkevin/ai-provider-spent/releases/latest) — pick the `.dmg` that matches your Mac:

- **Apple Silicon** (M1/M2/M3/M4) — `ai-provider-spent-*-arm64.dmg`
- **Intel** — `ai-provider-spent-*-x64.dmg`

> **Heads up:** these builds aren't signed with an Apple Developer ID or notarized by Apple. macOS will say the app "can't be opened because it is from an unidentified developer." Right-click (or Control-click) the app in your Applications folder → **Open** → confirm. You only need to do this once.

## Support This Project

Tired of that "unidentified developer" warning? Same. It's a $99/year Apple Developer account away from disappearing. If this app saves you from alt-tabbing to check your usage, [buy me a coffee](https://buymeacoffee.com/justanotherkevin) — once it hits $100, I'll get the Apple Developer account set up and ship signed, notarized builds so nobody has to see that warning again.

<p align="center">
  <a href="https://buymeacoffee.com/justanotherkevin"><img src="https://img.shields.io/badge/Buy%20me%20a%20coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black" alt="Buy Me a Coffee"></a>
</p>

## Features

| Feature                           | Description                                                                                               |
| --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Multi-provider spend**          | Today / 7 Days / Month views across Anthropic, OpenAI, DeepSeek, and (soon) Google Gemini                 |
| **Claude Code plan usage**        | Real session %, weekly %, per-model limits, and usage-credit spend — not an estimate                      |
| **Menu bar tray title**           | Shows your month-to-date total at a glance, no need to open the popover                                   |
| **Encrypted key storage**         | Admin API keys and dashboard tokens are encrypted at rest via the macOS Keychain (Electron `safeStorage`) |
| **Zero-config Claude Code usage** | If Claude Code is already logged in on your machine, usage tracking just works                            |

## Run From Source

Prefer to build it yourself instead of downloading a `.dmg`?

```bash
# Clone the repository
git clone https://github.com/justanotherkevin/ai-provider-spent.git
cd ai-provider-spent

# Install dependencies
npm install

# Start the app in development mode
npm run dev
```

The app appears as an icon in your menu bar — click it to open the popover.

### Configuration

Open **Settings** (gear icon in the popover) to add your provider Admin API keys:

| Provider      | Where to get a key                                                                                                                                                                                                                                        |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anthropic     | [console.anthropic.com/settings/admin-keys](https://console.anthropic.com/settings/admin-keys) — requires an organization Admin key, not a regular API key                                                                                                |
| OpenAI        | [platform.openai.com](https://platform.openai.com) — organization Admin key                                                                                                                                                                               |
| DeepSeek      | Your dashboard token. Sign in at [platform.deepseek.com](https://platform.deepseek.com), open the DevTools console, run `copy(JSON.parse(localStorage.userToken).value)`, and paste the result. The token may expire, and the app will ask for a new one. |
| Google Gemini | Not yet supported — requires a Cloud Billing BigQuery export                                                                                                                                                                                              |

DeepSeek has no official spend API, so the app reads daily cost from the same internal endpoint that the DeepSeek usage page uses, with your dashboard token. DeepSeek can change that endpoint without notice, and the token can expire, so the DeepSeek row may show an error until you paste a new token or update the app. Days are counted in UTC, so daily numbers can differ slightly from the dashboard, which uses your local time zone.

Claude Code plan usage needs no key at all — it reads the OAuth token Claude Code already stores locally once you're logged in via `claude` (Keychain on macOS, `~/.claude/.credentials.json` on other platforms).

## Building for Production

```bash
npm run build:mac      # macOS
npm run build:win      # Windows
npm run build:linux    # Linux
```

Distribution files are written to `dist/`.

## Tech Stack

Built with [Electron](https://www.electronjs.org), [React](https://react.dev), [TypeScript](https://www.typescriptlang.org), and [Vite](https://electron-vite.org), using a type-safe IPC layer ("Conveyor") validated with [Zod](https://zod.dev). Scaffolded from [guasam/electron-react-app](https://github.com/guasam/electron-react-app).

## License

[MIT](LICENSE)
