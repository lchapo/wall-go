import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TurnManager } from './TurnManager'
import { makeInitialState, snapshotFromState } from '@/store/gameState'
import type { PlayerAction, GameSnapshot } from '@/lib/types'
import type { PlayerAgent } from './PlayerAgent'

/** An agent whose action is resolved manually by the test. */
class ManualAgent implements PlayerAgent {
  resolve: ((a: PlayerAction) => void) | null = null
  cancelled = 0
  getAction(): Promise<PlayerAction> {
    return new Promise<PlayerAction>((res) => {
      this.resolve = res
    })
  }
  cancel() {
    this.cancelled++
  }
}

const WALL: PlayerAction = { type: 'wall', from: { x: 1, y: 1 }, pos: { x: 1, y: 1 }, dir: 'top' }

function makeManager(over = { value: false }) {
  const agent = new ManualAgent()
  const applied: PlayerAction[] = []
  let state: GameSnapshot = snapshotFromState(makeInitialState())
  state.phase = 'playing'
  const tm = new TurnManager({
    agents: { R: agent, B: agent },
    getGameState: () => state,
    applyAction: (a) => {
      applied.push(a)
    },
    isGameOver: () => over.value,
    turnTimeLimit: 1000,
  })
  return { tm, agent, applied, setState: (s: GameSnapshot) => (state = s) }
}

describe('TurnManager', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('逾時會自動下一手', async () => {
    const over = { value: false }
    const { tm, applied } = makeManager(over)
    void tm.startLoop()
    await vi.advanceTimersByTimeAsync(1001)
    expect(applied.length).toBeGreaterThan(0)
    tm.stop()
  })

  it('pause 會凍結逾時，resume 後才繼續計時', async () => {
    const over = { value: false }
    const { tm, applied } = makeManager(over)
    void tm.startLoop()
    await vi.advanceTimersByTimeAsync(400)
    tm.pause()
    // The remaining 600ms must not tick away while paused.
    await vi.advanceTimersByTimeAsync(5000)
    expect(applied).toHaveLength(0)
    tm.resume()
    await vi.advanceTimersByTimeAsync(599)
    expect(applied).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(2)
    expect(applied.length).toBeGreaterThan(0)
    tm.stop()
  })

  it('stop 之後逾時不會再套用動作', async () => {
    const over = { value: false }
    const { tm, applied, agent } = makeManager(over)
    void tm.startLoop()
    await vi.advanceTimersByTimeAsync(400)
    tm.stop()
    expect(agent.cancelled).toBeGreaterThan(0)
    await vi.advanceTimersByTimeAsync(5000)
    expect(applied).toHaveLength(0)
  })

  it('stop 之後才回覆的動作會被丟棄', async () => {
    const over = { value: false }
    const { tm, applied, agent } = makeManager(over)
    void tm.startLoop()
    await vi.advanceTimersByTimeAsync(10)
    const resolve = agent.resolve!
    tm.stop()
    resolve(WALL)
    await vi.advanceTimersByTimeAsync(10)
    expect(applied).toHaveLength(0)
  })

  it('結束後 stop 再 startLoop 可以重新開始', async () => {
    const over = { value: true }
    const { tm, applied, agent } = makeManager(over)
    await tm.startLoop()
    expect(applied).toHaveLength(0)
    // Rewinding out of a finished game must let the loop run again.
    over.value = false
    tm.stop()
    void tm.startLoop()
    await vi.advanceTimersByTimeAsync(10)
    agent.resolve!(WALL)
    await vi.advanceTimersByTimeAsync(10)
    expect(applied).toEqual([WALL])
    tm.stop()
  })

  it('暫停時收到的動作會等到 resume 才套用', async () => {
    const over = { value: false }
    const { tm, applied, agent } = makeManager(over)
    void tm.startLoop()
    await vi.advanceTimersByTimeAsync(10)
    tm.pause()
    agent.resolve!(WALL)
    await vi.advanceTimersByTimeAsync(100)
    expect(applied).toHaveLength(0)
    tm.resume()
    await vi.advanceTimersByTimeAsync(10)
    expect(applied).toEqual([WALL])
    tm.stop()
  })
})
