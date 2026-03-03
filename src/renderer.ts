import type { Graph, Dot } from './types'

const NODE_COLORS: Record<string, string> = {
  service:  '#4a9eff',
  store:    '#4aca82',
  queue:    '#f59e0b',
  eventBus: '#a855f7',
  external: '#608ba0',
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

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  graph: Graph,
  dots: Dot[]
) {
  const { width: W, height: H } = canvas

  ctx.fillStyle = '#0a0e19'
  ctx.fillRect(0, 0, W, H)

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

    ctx.beginPath()
    ctx.moveTo(src.cx, src.cy)
    ctx.quadraticCurveTo(cp.x, cp.y, dst.cx, dst.cy)
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    drawArrow(ctx, cp.x, cp.y, dst.cx, dst.cy)
  })

  dots.forEach(dot => {
    const edge = graph.edges[dot.edgeIndex]
    if (!edge) return
    const src = nodeMap.get(edge.from)
    const dst = nodeMap.get(edge.to)
    if (!src || !dst) return

    const offset = offsets[dot.edgeIndex]
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

  graph.nodes.forEach(node => {
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
