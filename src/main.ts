import { inject } from '@vercel/analytics'
import { parseYaml } from './parser'
import { applyLayout } from './layout'
import { renderFrame, formatMetric } from './renderer'
import { Simulation } from './simulation'
import type { Graph } from './types'

inject()

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

const yamlInput = document.querySelector<HTMLTextAreaElement>('#yaml-input')!
const btnPlay = document.querySelector<HTMLButtonElement>('#btn-play')!
const btnStop = document.querySelector<HTMLButtonElement>('#btn-stop')!
const toggleEditor = document.querySelector<HTMLButtonElement>('#toggle-editor')!
const editorPanel = document.querySelector<HTMLDivElement>('#editor-panel')!
const statsEl = document.querySelector<HTMLDivElement>('#stats')!
const legendEl = document.querySelector<HTMLDivElement>('#legend')!
const errorBanner = document.querySelector<HTMLDivElement>('#error-banner')!
const canvas = document.querySelector<HTMLCanvasElement>('#canvas')!
const ctx = canvas.getContext('2d')!

yamlInput.value = EXAMPLE_YAML

let graph: Graph | null = null
let sim: Simulation | null = null
let counts: number[] = []
let batchSize = 100

function resizeCanvas() {
  canvas.width = canvas.offsetWidth
  canvas.height = canvas.offsetHeight
  if (graph) {
    applyLayout(graph, canvas.width, canvas.height)
  }
}

function showError(msg: string) {
  errorBanner.textContent = msg
  errorBanner.style.display = 'block'
}

function hideError() {
  errorBanner.style.display = 'none'
}

function buildGraph(): Graph | null {
  try {
    const g = parseYaml(yamlInput.value)
    hideError()
    return g
  } catch (e: any) {
    showError(e.message)
    return null
  }
}

function buildStats() {
  if (!graph) return
  statsEl.innerHTML = graph.edges.map((edge, i) => `
    <div class="stat" style="border-color:${edge.color}">
      <div class="stat-label">${escapeHtml(edge.from)} → ${escapeHtml(edge.to)} [${formatMetric(edge.rate)}/sec]</div>
      <div class="stat-value" style="color:${edge.color}" data-edge="${i}">0</div>
    </div>
  `).join('')
}

function updateStatCounts() {
  statsEl.querySelectorAll<HTMLElement>('[data-edge]').forEach(el => {
    const i = Number(el.dataset.edge)
    el.textContent = String(counts[i] ?? 0)
  })
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function renderLegend() {
  if (!graph) return
  const types = [...new Set(graph.nodes.map(n => n.type))]
  const colors: Record<string, string> = {
    service: '#4a9eff', store: '#4aca82', queue: '#f59e0b', eventBus: '#a855f7', external: '#608ba0'
  }
  legendEl.innerHTML = types.map(t => `
    <div class="legend-item">
      <div class="legend-dot" style="background:${colors[t]}"></div>
      ${t}
    </div>
  `).join('')
}

btnPlay.addEventListener('click', () => {
  if (sim) { sim.stop(); sim = null }
  graph = buildGraph()
  if (!graph) return
  resizeCanvas()
  counts = graph.edges.map(() => 0)
  buildStats()
  renderLegend()

  sim = new Simulation(
    graph,
    (dots) => {
      renderFrame(ctx, canvas, graph!, dots)
      updateStatCounts()
    },
    (edgeIndex) => { counts[edgeIndex] = (counts[edgeIndex] ?? 0) + batchSize },
    batchSize
  )
  sim.start()
})

btnStop.addEventListener('click', () => {
  sim?.stop()
  sim = null
  ctx.fillStyle = '#0a0e19'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  statsEl.innerHTML = ''
})

toggleEditor.addEventListener('click', () => {
  editorPanel.classList.toggle('collapsed')
  setTimeout(resizeCanvas, 220)
})

let debounceTimer: ReturnType<typeof setTimeout>
yamlInput.addEventListener('input', () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    if (!sim) return
    const g = buildGraph()
    if (!g) return
    graph = g
    applyLayout(graph, canvas.width, canvas.height)
    counts = graph.edges.map((_, i) => counts[i] ?? 0)
    sim.updateGraph(graph)
    renderLegend()
  }, 400)
})

window.addEventListener('resize', () => {
  resizeCanvas()
})

resizeCanvas()
