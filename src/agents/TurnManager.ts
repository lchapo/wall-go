// TurnManager: controls the main game loop, sequentially waits for each player agent's action
import type { GameSnapshot } from '@/lib/types'
import type { Player } from '@/lib/types'
import type { PlayerAgent } from './PlayerAgent'
import type { PlayerAction } from '@/lib/types'
import { getRandomWallActionForPlayer } from '@/utils/ai'

export class TurnManager {
  private agents: Record<Player, PlayerAgent>
  private getGameState: () => GameSnapshot
  private applyAction: (action: PlayerAction) => Promise<void> | void
  private isGameOver: (state: GameSnapshot) => boolean
  private onTurnStart?: (state: GameSnapshot) => void
  private turnTimeLimit: number

  // Loop epoch. Every stop() invalidates the currently running loop so that an
  // action already in flight (an AI worker search, or the turn timeout) can never
  // be applied to a board that has since been rewound.
  private runId = 0
  private running = false

  // Turn timeout bookkeeping, shared with pause()/resume().
  private timeoutId: ReturnType<typeof setTimeout> | null = null
  private timeoutDeadline = 0
  private timeoutRemaining = 0
  private fireTimeout: (() => void) | null = null

  private paused = false
  private resumeWaiters: (() => void)[] = []

  constructor(params: {
    agents: Record<Player, PlayerAgent>
    getGameState: () => GameSnapshot
    applyAction: (action: PlayerAction) => Promise<void> | void
    isGameOver: (state: GameSnapshot) => boolean
    onTurnStart?: (state: GameSnapshot) => void
    turnTimeLimit?: number
  }) {
    this.agents = params.agents
    this.getGameState = params.getGameState
    this.applyAction = params.applyAction
    this.isGameOver = params.isGameOver
    this.onTurnStart = params.onTurnStart
    this.turnTimeLimit = params.turnTimeLimit ?? 90_000
  }

  // Recursively execute action and its followUp
  private async executeAction(action: PlayerAction) {
    if (!action) return
    // Execute corresponding store method based on action.type (must be provided externally)
    await this.applyAction(action)
    if (action.followUp) {
      await this.executeAction(action.followUp)
    }
  }

  private clearTurnTimeout() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
  }

  /** Invalidate the running loop and cancel whatever the current agent is doing. */
  stop() {
    this.runId++
    this.running = false
    this.clearTurnTimeout()
    this.fireTimeout = null
    // Unblock anything parked in waitUntilResumed() so the dead loop can unwind.
    this.paused = false
    const waiters = this.resumeWaiters
    this.resumeWaiters = []
    waiters.forEach((w) => w())
    for (const agent of Object.values(this.agents)) agent.cancel?.()
  }

  /** stop(), plus permanently tear down any worker-backed agents. */
  dispose() {
    this.stop()
    for (const agent of Object.values(this.agents)) agent.terminate?.()
  }

  isPaused() {
    return this.paused
  }

  /** Freeze the turn clock. The remaining time is preserved until resume(). */
  pause() {
    if (this.paused) return
    this.paused = true
    if (this.timeoutId) {
      this.timeoutRemaining = Math.max(0, this.timeoutDeadline - Date.now())
      this.clearTurnTimeout()
    }
  }

  resume() {
    if (!this.paused) return
    this.paused = false
    if (this.fireTimeout) this.armTurnTimeout(this.timeoutRemaining, this.fireTimeout)
    const waiters = this.resumeWaiters
    this.resumeWaiters = []
    waiters.forEach((w) => w())
  }

  private armTurnTimeout(ms: number, fire: () => void) {
    this.clearTurnTimeout()
    this.fireTimeout = fire
    this.timeoutDeadline = Date.now() + ms
    this.timeoutRemaining = ms
    this.timeoutId = setTimeout(fire, ms)
  }

  private waitUntilResumed(): Promise<void> {
    if (!this.paused) return Promise.resolve()
    return new Promise<void>((resolve) => {
      this.resumeWaiters.push(resolve)
    })
  }

  async startLoop() {
    if (this.running) return
    this.running = true
    const myRun = ++this.runId
    try {
      while (this.runId === myRun && !this.isGameOver(this.getGameState())) {
        const state = this.getGameState()
        if (this.onTurnStart) this.onTurnStart(state)
        const agent = this.agents[state.turn]

        const timeoutPromise = new Promise<PlayerAction>((resolve) => {
          const fire = () => {
            agent.cancel?.()
            const auto =
              getRandomWallActionForPlayer(state, state.turn) ??
              ({
                type: 'wall',
                from: { x: 0, y: 0 },
                pos: { x: 0, y: 0 },
                dir: 'top',
              } as PlayerAction)
            resolve(auto)
          }
          // Start paused if the loop was (re)started while the game is paused.
          if (this.paused) {
            this.fireTimeout = fire
            this.timeoutRemaining = this.turnTimeLimit
          } else {
            this.armTurnTimeout(this.turnTimeLimit, fire)
          }
        })

        let action: PlayerAction
        try {
          action = (await Promise.race([agent.getAction(state), timeoutPromise])) as PlayerAction
        } catch (err) {
          if (this.runId !== myRun) return
          console.error('[TurnManager] agent action failed', err)
          return
        }
        if (this.runId !== myRun) return
        this.clearTurnTimeout()
        this.fireTimeout = null

        // Hold a resolved action back until the game is unpaused.
        await this.waitUntilResumed()
        if (this.runId !== myRun) return

        await this.executeAction(action)
        if (this.runId !== myRun) return
      }
    } finally {
      if (this.runId === myRun) {
        this.running = false
        this.clearTurnTimeout()
        this.fireTimeout = null
      }
    }
  }
}
