export type NodeType = 'service' | 'store' | 'queue' | 'eventBus' | 'external'

export interface GraphNode {
  id: string
  label: string
  type: NodeType
  x?: number
  y?: number
  cx: number
  cy: number
  w: number
  h: number
}

export interface GraphEdge {
  from: string
  to: string
  rate: number
  color: string
}

export interface Graph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface Dot {
  edgeIndex: number
  t: number
  travelTime: number
  trail: Array<{ x: number; y: number; a: number }>
}

export interface SimulationConfig {
  batchSize: number
}
