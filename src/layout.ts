import type { Graph } from './types'

const NODE_W = 200
const NODE_H = 72
const COL_GAP = 100
const ROW_GAP = 110
const COLS = 3
const MARGIN_X = 100
const MARGIN_Y = 120

export function applyLayout(graph: Graph, canvasW: number, canvasH: number): void {
  const scale = Math.min(canvasW / 1400, canvasH / 820)

  const nw = NODE_W * scale
  const nh = NODE_H * scale
  const cg = COL_GAP * scale
  const rg = ROW_GAP * scale
  const mx = MARGIN_X * scale
  const my = MARGIN_Y * scale

  graph.nodes.forEach((node, i) => {
    node.w = nw
    node.h = nh
    if (node.x !== undefined && node.y !== undefined) {
      node.cx = node.x * scale + mx
      node.cy = node.y * scale + my
    } else {
      const col = i % COLS
      const row = Math.floor(i / COLS)
      node.cx = mx + col * (nw + cg) + nw / 2
      node.cy = my + row * (nh + rg) + nh / 2
    }
  })
}
