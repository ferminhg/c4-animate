import yaml from 'js-yaml'
import type { Graph, GraphNode, GraphEdge, NodeType } from './types'

const VALID_TYPES: NodeType[] = ['service', 'store', 'queue', 'eventBus', 'external']

export function parseYaml(input: string): Graph {
  const raw = yaml.load(input) as any

  if (!raw || typeof raw !== 'object') throw new Error('Invalid YAML: expected an object')

  const nodes: GraphNode[] = (raw.nodes ?? []).map((n: any) => {
    if (!n.id) throw new Error(`Node missing required field: id`)
    if (!n.label) throw new Error(`Node "${n.id}" missing required field: label`)
    const type: NodeType = VALID_TYPES.includes(n.type) ? n.type : 'service'
    return {
      id: String(n.id),
      label: String(n.label),
      type,
      x: typeof n.x === 'number' ? n.x : undefined,
      y: typeof n.y === 'number' ? n.y : undefined,
      cx: 0, cy: 0, w: 0, h: 0,
    }
  })

  const nodeIds = new Set(nodes.map(n => n.id))

  const edges: GraphEdge[] = (raw.edges ?? []).map((e: any) => {
    if (!e.from) throw new Error(`Edge missing required field: from`)
    if (!e.to) throw new Error(`Edge missing required field: to`)
    if (!nodeIds.has(e.from)) throw new Error(`Edge references unknown node: "${e.from}"`)
    if (!nodeIds.has(e.to)) throw new Error(`Edge references unknown node: "${e.to}"`)
    return {
      from: String(e.from),
      to: String(e.to),
      rate: typeof e.rate === 'number' ? e.rate : 100,
      color: typeof e.color === 'string' ? e.color : '#4a9eff',
    }
  })

  return { nodes, edges }
}
