import type { GameSnapshot } from '@/lib/types'
import type { PlayerAction } from '@/lib/types'

export interface PlayerAgent {
  getAction(gameState: GameSnapshot): Promise<PlayerAction>
  /** Abandon the in-flight action, but keep the agent usable for the next turn. */
  cancel?(): void
  /** Permanently release any resources (e.g. a Web Worker). */
  terminate?(): void
}
