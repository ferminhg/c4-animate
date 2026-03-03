import type { Graph, Dot } from './types'

const TRAVEL_TIME = 3000

export class Simulation {
  private dots: Dot[] = []
  private accumulator: number[] = []
  private lastTime: number | null = null
  private rafId: number | null = null
  private running = false

  constructor(
    private graph: Graph,
    private onFrame: (dots: Dot[]) => void,
    private onCount: (edgeIndex: number) => void,
    private batchSize: number = 1
  ) {}

  start() {
    if (this.running) return
    this.running = true
    this.accumulator = this.graph.edges.map(() => 0)
    this.lastTime = null
    this.loop()
  }

  stop() {
    this.running = false
    if (this.rafId !== null) cancelAnimationFrame(this.rafId)
    this.rafId = null
    this.dots = []
    this.lastTime = null
  }

  updateGraph(graph: Graph) {
    this.graph = graph
    this.dots = this.dots.filter(d => d.edgeIndex < graph.edges.length)
    this.accumulator = graph.edges.map((_, i) => this.accumulator[i] ?? 0)
  }

  private loop() {
    this.rafId = requestAnimationFrame((now) => {
      if (!this.running) return
      const rawDt = this.lastTime === null ? 0 : now - this.lastTime
      const dt = Math.min(rawDt, 100)
      this.lastTime = now

      const speed = 1 / TRAVEL_TIME

      this.dots = this.dots.filter(dot => {
        dot.t += speed * dt
        if (dot.t >= 1) {
          this.onCount(dot.edgeIndex)
          return false
        }
        return true
      })

      this.graph.edges.forEach((edge, i) => {
        this.accumulator[i] += (edge.rate / 1000) * dt * this.batchSize
        while (this.accumulator[i] >= 1) {
          this.dots.push({ edgeIndex: i, t: 0, trail: [] })
          this.accumulator[i] -= 1
        }
      })

      this.onFrame(this.dots)
      this.loop()
    })
  }
}
