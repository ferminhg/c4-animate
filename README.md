# C4Flow

**Define your system architecture in YAML and watch traffic animate across it in real time — entirely in the browser.**

C4Flow is a client-side web tool that parses a simple YAML definition of nodes, edges, and traffic rates and renders a live animated simulation on a canvas. Write your architecture in the editor, hit play, and watch requests flow between services.

No backend. No framework. Just YAML and a canvas.

## What it does

- **YAML editor** — Define nodes, edges, and traffic rates directly in the browser
- **Live canvas renderer** — Renders nodes and edges with bezier curves and arrowheads
- **Traffic simulation** — Animated dots represent requests moving through the system at configurable rates per edge
- **Counters panel** — Real-time stats showing requests processed per edge
- **Legend** — Auto-generated legend based on node types in the diagram
- **Collapsible editor** — Toggle the editor panel to focus on the canvas
- **Zero backend** — Everything runs client-side as a static site

## Quick start

```bash
git clone https://github.com/<your-user>/c4flow.git
cd c4flow
npm install
npm run dev
```

Open `http://localhost:5173`, edit the YAML in the left panel, and click **▶ Play**.

## Example input

```yaml
nodes:
  - id: gateway
    label: API Gateway
    type: service
  - id: redis
    label: Redis
    type: store
  - id: postgres
    label: PostgreSQL
    type: store
  - id: kafka
    label: Kafka
    type: eventBus
  - id: worker
    label: Worker
    type: service

edges:
  - from: gateway
    to: redis
    rate: 500
    color: "#f59e0b"
  - from: gateway
    to: postgres
    rate: 200
    color: "#4a9eff"
  - from: gateway
    to: kafka
    rate: 300
    color: "#4aca82"
  - from: kafka
    to: worker
    rate: 300
    color: "#a855f7"
  - from: worker
    to: postgres
    rate: 200
    color: "#4aca82"
```

## YAML schema

### Nodes

| Field   | Required | Description |
|---------|----------|-------------|
| `id`    | yes      | Unique identifier used in edge references |
| `label` | yes      | Display name shown on the canvas |
| `type`  | no       | One of `service`, `store`, `queue`, `eventBus`, `external` (default: `service`) |
| `x`     | no       | Manual x position in layout units |
| `y`     | no       | Manual y position in layout units |

### Edges

| Field   | Required | Description |
|---------|----------|-------------|
| `from`  | yes      | Source node id |
| `to`    | yes      | Target node id |
| `rate`  | no       | Dots spawned per second (default: `100`) |
| `color` | no       | Dot and stat color as a CSS color string (default: `#4a9eff`) |

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Browser                     │
│                                              │
│  ┌──────────────┐   ┌────────────────────┐  │
│  │  YAML Editor │   │   Canvas Renderer  │  │
│  │  (textarea)  │──▶│  Nodes + Edges     │  │
│  │              │   │  Bezier curves     │  │
│  └──────────────┘   │  Animated dots     │  │
│                     └────────────────────┘  │
│         │                    ▲               │
│         ▼                    │               │
│  ┌──────────────┐   ┌────────────────────┐  │
│  │ YAML Parser  │   │ Simulation Engine  │  │
│  │ (js-yaml)    │──▶│ RAF loop           │  │
│  │              │   │ Rate-based spawn   │  │
│  └──────────────┘   └────────────────────┘  │
│         │                                   │
│         ▼                                   │
│  ┌──────────────┐                           │
│  │ Layout Engine│                           │
│  │ Grid + manual│                           │
│  │ x/y override │                           │
│  └──────────────┘                           │
└─────────────────────────────────────────────┘
```

## Tech stack

- **TypeScript** — End to end type safety
- **Vite** — Dev server and build tooling
- **js-yaml** — YAML parsing
- **Canvas API** — High-performance rendering for animated traffic dots
- **Vanilla HTML/CSS** — No UI frameworks

## Deployment

The app builds to a static `dist/` folder and is configured for Vercel:

```bash
npm run build
```

## Roadmap

- [x] Project scaffold with split-panel layout
- [x] Core TypeScript types
- [x] YAML parser with validation
- [x] Grid layout engine with manual x/y override
- [x] Canvas renderer (nodes, edges, bezier curves, dots)
- [x] Simulation engine (RAF loop, rate-based dot spawning)
- [x] Wire everything together in main
- [x] Vercel deployment config
- [ ] Force-directed layout
- [ ] Export as standalone HTML
- [ ] Theme customization
- [ ] Step-through narration mode

## License

MIT
