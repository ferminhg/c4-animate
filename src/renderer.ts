import type { Graph, Dot } from './types'

function formatMetric(value: number): string {
  if (value >= 1000000) {
    const m = (value / 1000000).toFixed(1)
    return m.endsWith('.0') ? `${Math.round(value / 1000000)}M` : `${m}M`
  }
  if (value >= 1000) {
    const k = (value / 1000).toFixed(1)
    return k.endsWith('.0') ? `${Math.round(value / 1000)}k` : `${k}k`
  }
  return value.toString()
}

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

function rRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function edgeLineColor(srcType: string, dstType: string): string {
  if (srcType === 'eventBus' || dstType === 'eventBus') return '#2a2a1a'
  if (srcType === 'store' || dstType === 'store') return '#1a1a2a'
  return '#162840'
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  graph: Graph,
  dots: Dot[]
) {
  const { width: W, height: H } = canvas

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

  const nodeMap = new Map(graph.nodes.map(n => [n.id, n]))

  const offsets = graph.edges.map((edge, i) => {
    const hasPair = graph.edges.some((e, j) => j !== i && e.from === edge.to && e.to === edge.from)
    if (!hasPair) return 0
    const isFirst = graph.edges.findIndex(e => e.from === edge.to && e.to === edge.from) > i
    return isFirst ? 40 : -40
  })

  graph.edges.forEach((edge, i) => {
    const src = nodeMap.get(edge.from)
    const dst = nodeMap.get(edge.to)
    if (!src || !dst) return

    const offset = offsets[i]
    const cp = controlPoint(src.cx, src.cy, dst.cx, dst.cy, offset)

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
  })

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

  graph.nodes.forEach(node => {
    const border = NODE_BORDER[node.type] ?? '#4a9eff'
    const nodeBg = NODE_BG[node.type] ?? '#0d1f3c'
    const x = node.cx - node.w / 2
    const y = node.cy - node.h / 2
    const r = Math.max(4, node.w * 0.05)

    ctx.fillStyle = nodeBg
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

    const totalRate = graph.edges.filter(e => e.to === node.id).reduce((sum, e) => sum + e.rate, 0)
    const metricText = formatMetric(totalRate)

    ctx.fillStyle = '#c8ddf0'
    ctx.font = `bold ${labelSize}px 'Courier New', monospace`
    ctx.fillText(node.label, node.cx, node.cy - node.h * 0.14, node.w - 10)

    ctx.fillStyle = border
    ctx.font = `${subSize}px 'Courier New', monospace`
    ctx.fillText(node.type, node.cx, node.cy + node.h * 0.18, node.w - 10)

    ctx.fillStyle = '#88ccff'
    ctx.font = `bold ${Math.max(10, node.h * 0.2)}px 'Courier New', monospace`
    ctx.fillText(metricText, node.cx, node.cy + node.h * 0.4, node.w - 10)
  })
}

function controlPoint(x1: number, y1: number, x2: number, y2: number, offset: number) {
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  return { x: mx - (dy / len) * offset, y: my + (dx / len) * offset }
}

function quadraticPoint(x1: number, y1: number, cpx: number, cpy: number, x2: number, y2: number, t: number) {
  const it = 1 - t
  return {
    x: it * it * x1 + 2 * it * t * cpx + t * t * x2,
    y: it * it * y1 + 2 * it * t * cpy + t * t * y2,
  }
}

function drawArrow(ctx: CanvasRenderingContext2D, cpx: number, cpy: number, tx: number, ty: number) {
  const angle = Math.atan2(ty - cpy, tx - cpx)
  const size = 7
  ctx.beginPath()
  ctx.moveTo(tx, ty)
  ctx.lineTo(tx - size * Math.cos(angle - 0.4), ty - size * Math.sin(angle - 0.4))
  ctx.lineTo(tx - size * Math.cos(angle + 0.4), ty - size * Math.sin(angle + 0.4))
  ctx.closePath()
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.fill()
}
