# Visual Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the visualization look like the reference examples — readable node text, distinct animated dots with trails, harmonic layout, and richer background/node styling.

**Architecture:** All changes are isolated to `src/renderer.ts`, `src/layout.ts`, and the example YAML in `src/main.ts`. No new files needed. No changes to types, parser, or simulation engine.

**Tech Stack:** Canvas API, TypeScript. Same stack as before.

---

### Task 1: Better background and node styling in renderer.ts

The current renderer uses a flat background and uniform node styling. This task adds a radial gradient background with a subtle dot grid, and per-type node background colors and border colors (matching the reference).

**Files:**
- Modify: `src/renderer.ts`

**Step 1: Read the current renderer**

```bash
cat /Users/seedtag/projects/personal/c4-animate/src/renderer.ts
```

**Step 2: Replace the NODE_COLORS constant and add NODE_BG_COLORS**

Current:
```typescript
const NODE_COLORS: Record<string, string> = {
  service:  '#4a9eff',
  store:    '#4aca82',
  queue:    '#f59e0b',
  eventBus: '#a855f7',
  external: '#608ba0',
}
```

Replace with:
```typescript
const NODE_BORDER: Record<string, string> = {
  service:  '#4a9eff',
  store:    '#f59e0b',
  queue:    '#4aca82',
  eventBus: '#a855f7',
  external: '#608ba0',
}

const NODE_BG: Record<string, string> = {
  service:  '#0d2847',
  store:    '#1a1a2a',
  queue:    '#1a2a1a',
  eventBus: '#2a1a4a',
  external: '#2a1a3a',
}
```

**Step 3: Replace the background fill with radial gradient + dot grid**

Current in `renderFrame`:
```typescript
  ctx.fillStyle = '#0a0e19'
  ctx.fillRect(0, 0, W, H)
```

Replace with:
```typescript
  const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7)
  bg.addColorStop(0, '#0d1a2e')
  bg.addColorStop(1, '#0a0e19')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  const scale = Math.min(W / 1400, H / 820)
  const gridStep = 35 * scale
  ctx.fillStyle = '#151f30'
  for (let gx = 0; gx < W; gx += gridStep) {
    for (let gy = 0; gy < H; gy += gridStep) {
      ctx.fillRect(gx, gy, 1, 1)
    }
  }
```

**Step 4: Update the node drawing block to use type-specific colors and better text**

Current node drawing block (inside `graph.nodes.forEach`):
```typescript
    const color = NODE_COLORS[node.type] ?? '#4a9eff'
    const x = node.cx - node.w / 2
    const y = node.cy - node.h / 2

    ctx.fillStyle = 'rgba(13,31,60,0.95)'
    rRect(ctx, x, y, node.w, node.h, 8)
    ctx.fill()

    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    rRect(ctx, x, y, node.w, node.h, 8)
    ctx.stroke()

    ctx.fillStyle = '#fff'
    ctx.font = `bold ${Math.max(11, node.h * 0.22)}px 'Courier New', monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(node.label, node.cx, node.cy - 6)

    ctx.fillStyle = color
    ctx.font = `${Math.max(9, node.h * 0.17)}px 'Courier New', monospace`
    ctx.fillText(node.type, node.cx, node.cy + 10)
```

Replace with:
```typescript
    const border = NODE_BORDER[node.type] ?? '#4a9eff'
    const bg = NODE_BG[node.type] ?? '#0d1f3c'
    const x = node.cx - node.w / 2
    const y = node.cy - node.h / 2
    const r = Math.max(4, node.w * 0.05)

    ctx.fillStyle = bg
    rRect(ctx, x, y, node.w, node.h, r)
    ctx.fill()

    ctx.strokeStyle = border
    ctx.lineWidth = 1.5
    rRect(ctx, x, y, node.w, node.h, r)
    ctx.stroke()

    const labelSize = Math.max(11, node.h * 0.24)
    const subSize = Math.max(9, node.h * 0.18)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    ctx.fillStyle = '#c8ddf0'
    ctx.font = `bold ${labelSize}px 'Courier New', monospace`
    ctx.fillText(node.label, node.cx, node.cy - node.h * 0.14, node.w - 10)

    ctx.fillStyle = border
    ctx.font = `${subSize}px 'Courier New', monospace`
    ctx.fillText(node.type, node.cx, node.cy + node.h * 0.18, node.w - 10)
```

**Step 5: Update all references from NODE_COLORS to NODE_BORDER in the file**

Search for any remaining use of `NODE_COLORS` (there should be none after step 2 and 4) and confirm it's gone.

**Step 6: Verify build**

```bash
cd /Users/seedtag/projects/personal/c4-animate && npm run build 2>&1
```

Expected: no TypeScript errors.

**Step 7: Commit**

```bash
cd /Users/seedtag/projects/personal/c4-animate
git add src/renderer.ts
git commit -m "feat: radial gradient background, dot grid, per-type node colors and text"
```

---

### Task 2: Dot trail effect and better dot rendering

The current dots are plain circles with a small glow. At high rates they cluster into a continuous line. This task adds a trail (fading history of past positions) and a white highlight to each dot, making individual dots visible even at high density.

The trail lives in the Dot type and simulation engine — but to keep changes minimal, we store trails in the renderer using a WeakMap-like approach keyed by dot identity. Actually the simpler approach: add a `trail` array to the `Dot` type, and update the simulation to push positions and the renderer to draw them.

**Files:**
- Modify: `src/types.ts`
- Modify: `src/simulation.ts`
- Modify: `src/renderer.ts`

**Step 1: Add trail to Dot type**

In `src/types.ts`, update the `Dot` interface:

```typescript
export interface Dot {
  edgeIndex: number
  t: number
  speed: number
  trail: Array<{ x: number; y: number; a: number }>
}
```

**Step 2: Initialize trail when spawning dots in simulation.ts**

In `src/simulation.ts`, in the spawn block:

Current:
```typescript
          this.dots.push({ edgeIndex: i, t: 0, speed })
```

Replace with:
```typescript
          this.dots.push({ edgeIndex: i, t: 0, speed, trail: [] })
```

**Step 3: Update dot drawing in renderer.ts**

The renderer needs to:
1. Compute current dot position
2. Push it to `dot.trail`, cap at 16 entries, fade alpha each frame
3. Draw trail circles with fading alpha
4. Draw outer glow halo
5. Draw main dot
6. Draw white inner highlight

Replace the current dots drawing block:

Current:
```typescript
  dots.forEach(dot => {
    const edge = graph.edges[dot.edgeIndex]
    if (!edge) return
    const src = nodeMap.get(edge.from)
    const dst = nodeMap.get(edge.to)
    if (!src || !dst) return

    const offset = getBezierOffset(graph.edges, dot.edgeIndex)  // (now offsets[dot.edgeIndex])
    const cp = controlPoint(src.cx, src.cy, dst.cx, dst.cy, offset)
    const pos = quadraticPoint(src.cx, src.cy, cp.x, cp.y, dst.cx, dst.cy, dot.t)

    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2)
    ctx.fillStyle = edge.color
    ctx.shadowColor = edge.color
    ctx.shadowBlur = 8
    ctx.fill()
    ctx.shadowBlur = 0
  })
```

Replace with:
```typescript
  const dotRadius = Math.max(3, Math.min(W, H) * 0.004)

  dots.forEach(dot => {
    const edge = graph.edges[dot.edgeIndex]
    if (!edge) return
    const src = nodeMap.get(edge.from)
    const dst = nodeMap.get(edge.to)
    if (!src || !dst) return

    const cp = controlPoint(src.cx, src.cy, dst.cx, dst.cy, offsets[dot.edgeIndex])
    const pos = quadraticPoint(src.cx, src.cy, cp.x, cp.y, dst.cx, dst.cy, dot.t)

    dot.trail.push({ x: pos.x, y: pos.y, a: 1 })
    if (dot.trail.length > 16) dot.trail.shift()
    dot.trail.forEach(tp => { tp.a *= 0.82 })

    dot.trail.forEach(tp => {
      ctx.beginPath()
      ctx.arc(tp.x, tp.y, dotRadius * tp.a * 0.5, 0, Math.PI * 2)
      ctx.fillStyle = edge.color
      ctx.globalAlpha = tp.a * 0.3
      ctx.fill()
    })
    ctx.globalAlpha = 1

    ctx.beginPath()
    ctx.arc(pos.x, pos.y, dotRadius * 2.2, 0, Math.PI * 2)
    ctx.fillStyle = edge.color
    ctx.globalAlpha = 0.12
    ctx.fill()
    ctx.globalAlpha = 1

    ctx.beginPath()
    ctx.arc(pos.x, pos.y, dotRadius, 0, Math.PI * 2)
    ctx.fillStyle = edge.color
    ctx.fill()

    ctx.beginPath()
    ctx.arc(pos.x, pos.y, dotRadius * 0.4, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.globalAlpha = 0.6
    ctx.fill()
    ctx.globalAlpha = 1
  })
```

**Step 4: Verify build**

```bash
cd /Users/seedtag/projects/personal/c4-animate && npm run build 2>&1
```

Expected: no TypeScript errors.

**Step 5: Commit**

```bash
cd /Users/seedtag/projects/personal/c4-animate
git add src/types.ts src/simulation.ts src/renderer.ts
git commit -m "feat: dot trail effect with fading alpha and white highlight"
```

---

### Task 3: Better layout and example YAML

The current grid layout (4 columns, small nodes, tight spacing) produces a mechanical look. This task makes nodes larger, increases spacing, uses 3 columns, and updates the example YAML to use more sensible rates so dots are visible as individual particles.

**Files:**
- Modify: `src/layout.ts`
- Modify: `src/main.ts`

**Step 1: Read current layout.ts**

```bash
cat /Users/seedtag/projects/personal/c4-animate/src/layout.ts
```

**Step 2: Update layout constants**

Current:
```typescript
const NODE_W = 140
const NODE_H = 50
const COL_GAP = 60
const ROW_GAP = 80
const COLS = 4
const MARGIN_X = 80
const MARGIN_Y = 80
```

Replace with:
```typescript
const NODE_W = 160
const NODE_H = 58
const COL_GAP = 90
const ROW_GAP = 100
const COLS = 3
const MARGIN_X = 100
const MARGIN_Y = 120
```

**Step 3: Update the example YAML in main.ts**

The current rates (200-500) produce hundreds of dots per edge — they merge into a line visually. Target rates of 30-80 so dots travel with clear spacing between them.

Current EXAMPLE_YAML in `src/main.ts`:
```typescript
const EXAMPLE_YAML = `nodes:
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
`
```

Replace with:
```typescript
const EXAMPLE_YAML = `nodes:
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
    rate: 60
    color: "#f59e0b"
  - from: gateway
    to: postgres
    rate: 30
    color: "#4a9eff"
  - from: gateway
    to: kafka
    rate: 45
    color: "#4aca82"
  - from: kafka
    to: worker
    rate: 45
    color: "#a855f7"
  - from: worker
    to: postgres
    rate: 30
    color: "#4aca82"
`
```

**Step 4: Verify build**

```bash
cd /Users/seedtag/projects/personal/c4-animate && npm run build 2>&1
```

Expected: no TypeScript errors.

**Step 5: Commit**

```bash
cd /Users/seedtag/projects/personal/c4-animate
git add src/layout.ts src/main.ts
git commit -m "feat: larger nodes, better spacing, sensible default rates"
```

---

### Task 4: Edge styling — dashed lines with type-aware color

The reference examples use dashed lines for edges with subtle colors based on the connected node types. This makes the graph easier to read because the edge lines don't compete with the animated dots.

**Files:**
- Modify: `src/renderer.ts`

**Step 1: Update edge drawing in renderFrame**

Current edge drawing block:
```typescript
    ctx.beginPath()
    ctx.moveTo(src.cx, src.cy)
    ctx.quadraticCurveTo(cp.x, cp.y, dst.cx, dst.cy)
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    drawArrow(ctx, cp.x, cp.y, dst.cx, dst.cy)
```

Replace with:
```typescript
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(src.cx, src.cy)
    ctx.quadraticCurveTo(cp.x, cp.y, dst.cx, dst.cy)
    ctx.strokeStyle = edgeLineColor(src.type, dst.type)
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 4])
    ctx.stroke()
    ctx.restore()

    drawArrow(ctx, cp.x, cp.y, dst.cx, dst.cy)
```

**Step 2: Add edgeLineColor helper function**

Add this function before `renderFrame`:

```typescript
function edgeLineColor(srcType: string, dstType: string): string {
  if (srcType === 'eventBus' || dstType === 'eventBus') return '#2a2a1a'
  if (srcType === 'store' || dstType === 'store') return '#1a1a2a'
  return '#162840'
}
```

**Step 3: Verify build**

```bash
cd /Users/seedtag/projects/personal/c4-animate && npm run build 2>&1
```

Expected: no TypeScript errors.

**Step 4: Commit**

```bash
cd /Users/seedtag/projects/personal/c4-animate
git add src/renderer.ts
git commit -m "feat: dashed edge lines with type-aware color"
```

---

## Summary

| Task | What it improves |
|------|-----------------|
| 1 | Background (radial gradient + dot grid), node colors per type, readable text |
| 2 | Dot trail effect + white highlight — individual dots are now visible |
| 3 | Larger nodes, more spacing, sensible default rates |
| 4 | Dashed edges with subtle type-aware colors |
