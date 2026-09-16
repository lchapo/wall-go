import { PLAYER_LIST, type AiLevel, type Player, type PlayerAction } from '@/lib/types'
import GameButton from './ui/GameButton'
import Navbar from './ui/Navbar'
import Board from './Board/Board'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { useGame } from '@/store/index'
import { useMatch } from '@/store/match'
import { getTurnBoundaries, sliderValueForIndex } from '@/store/timeline'
import { checkGameEnd } from '@/utils/game'
import { useRef, useEffect, useCallback, useMemo, useState } from 'react'
import { TurnManager } from '@/agents/TurnManager'
import { HumanAgent, RandomAgent, MinimaxAgent } from '@/agents'
import { snapshotFromState } from '@/store/gameState'
import ConfirmDialog from './ui/ConfirmDialog'
import ColorPickDialog from './ui/ColorPickDialog'
import HistorySlider from './ui/HistorySlider'
import ScoreRow from './ui/ScoreRow'
import TurnTimer from './ui/TurnTimer'

export default function Game({
  gameMode,
  aiSide,
  aiLevel,
  setGameMode,
  setShowRule,
  dark,
  setDark,
}: {
  gameMode: 'pvp' | 'ai'
  aiSide: 'R' | 'B'
  aiLevel: AiLevel
  setGameMode: (m: 'pvp' | 'ai' | null) => void
  setShowRule: (b: boolean) => void
  dark: boolean
  setDark: (d: boolean | ((d: boolean) => boolean)) => void
}) {
  // 內部自行管理 useGame 狀態與 AI 流程
  const {
    board,
    turn,
    phase,
    result,
    selected,
    legal,
    placeStone,
    selectStone,
    moveTo,
    buildWall,
    setPhase,
    resetGame,
    canUndo,
    canRedo,
    _history,
    _future,
  } = useGame()
  const live = checkGameEnd(board, [...PLAYER_LIST])
  const { t } = useTranslation()
  const [showConfirm, setShowConfirm] = useState(false)
  const [showColorPick, setShowColorPick] = useState(false)
  const [timeLeft, setTimeLeft] = useState(90_000)
  const turnTimeLimit = 90_000
  const [paused, setPaused] = useState(false)

  // --- history scrubbing ---
  // `_history ++ _future` is one continuous timeline; the slider indexes the
  // completed turns within it, and `previewValue` is a slider value (not a
  // timeline index) that is rendered without being committed to the store.
  const timeline = useMemo(() => [..._history, ..._future], [_history, _future])
  const boundaries = useMemo(() => getTurnBoundaries(timeline), [timeline])
  const liveValue = sliderValueForIndex(boundaries, _history.length - 1)
  const [previewValue, setPreviewValue] = useState<number | null>(null)
  const previewSnapshot = previewValue === null ? null : timeline[boundaries[previewValue]]

  // A landed move (often the AI's) invalidates any in-flight scrub.
  useEffect(() => {
    setPreviewValue(null)
  }, [_history, _future])

  // Both scrubbing and an explicit pause freeze the clock and lock the board.
  const frozen = paused || previewValue !== null

  // --- 代理主流程整合 ---
  const turnManagerRef = useRef<TurnManager | null>(null)
  const humanAgentRef = useRef<HumanAgent | null>(null)
  const turnManagerStartedRef = useRef(false)
  // Turn clock: `turnStartRef` is the start of the currently running segment and
  // `elapsedRef` accumulates the segments already spent on this turn, so pausing
  // resumes where it stopped rather than restarting the 90s.
  const turnStartRef = useRef<number | null>(null)
  const elapsedRef = useRef(0)

  const setupTurnManager = useCallback(() => {
    if (!gameMode) return
    // Release the previous manager's AI worker before replacing it.
    turnManagerRef.current?.dispose()
    const human = new HumanAgent()
    humanAgentRef.current = human
    const aiMap = {
      practice: new RandomAgent(),
      easy: new MinimaxAgent(2),
      middle: new MinimaxAgent(4),
      hard: new MinimaxAgent(6),
    }
    const ai = aiMap[aiLevel]
    const agents =
      gameMode === 'ai'
        ? aiSide === 'R'
          ? { R: ai, B: human }
          : { R: human, B: ai }
        : { R: human, B: human }
    turnManagerRef.current = new TurnManager({
      agents,
      // Read the store directly: the loop resumes at `await` boundaries that can
      // precede a React commit, so anything cached in a ref would be stale.
      getGameState: () => snapshotFromState(useGame.getState()),
      applyAction: async (action: PlayerAction) => {
        if (action.type === 'place') {
          placeStone(action.pos)
        } else if (action.type === 'move') {
          if (action.from) selectStone(action.from)
          moveTo(action.pos)
        } else if (action.type === 'wall' && action.dir) {
          if (action.from) selectStone(action.from)
          buildWall(action.pos, action.dir)
        }
      },
      isGameOver: (state) => state.phase === 'finished' || !!state.result,
      turnTimeLimit,
      onTurnStart: (state) => {
        if (state.phase !== 'playing') return
        elapsedRef.current = 0
        turnStartRef.current = Date.now()
        setTimeLeft(turnTimeLimit)
      },
    })
    turnManagerStartedRef.current = false
  }, [gameMode, aiSide, aiLevel, buildWall, moveTo, placeStone, selectStone])

  useEffect(() => {
    if (!gameMode) {
      useGame.getState().setHumanSide(null)
      return
    }
    if (gameMode === 'ai') {
      useGame.getState().setHumanSide(aiSide === 'R' ? 'B' : 'R')
    } else {
      useGame.getState().setHumanSide(null)
    }
  }, [gameMode, aiSide])

  useEffect(() => {
    if (!gameMode) return
    setPhase('placing')
    setupTurnManager()
  }, [gameMode, aiSide, setPhase, setupTurnManager])

  // Release the AI worker when leaving the game screen.
  useEffect(() => () => turnManagerRef.current?.dispose(), [])

  useEffect(() => {
    if (!turnManagerRef.current) return
    if ((phase === 'placing' || phase === 'playing') && !turnManagerStartedRef.current) {
      turnManagerRef.current.startLoop()
      turnManagerStartedRef.current = true
    }
  }, [phase])

  /** Invalidate whatever the agents are doing and restart the loop at the current position. */
  const resumeLoop = useCallback(() => {
    const tm = turnManagerRef.current
    if (!tm) return
    tm.stop()
    const p = useGame.getState().phase
    const shouldRun = p === 'placing' || p === 'playing'
    turnManagerStartedRef.current = shouldRun
    if (shouldRun) void tm.startLoop()
  }, [])

  const leaveHistoryView = useCallback(() => {
    setPreviewValue(null)
    setPaused(false)
  }, [])

  const handleUndo = useCallback(() => {
    leaveHistoryView()
    useGame.getState().undo()
    resumeLoop()
  }, [leaveHistoryView, resumeLoop])

  const handleRedo = useCallback(() => {
    leaveHistoryView()
    useGame.getState().redo()
    resumeLoop()
  }, [leaveHistoryView, resumeLoop])

  const handleJump = useCallback(
    (value: number) => {
      const target = boundaries[value]
      if (target === undefined) return
      leaveHistoryView()
      useGame.getState().jumpTo(target)
      resumeLoop()
    },
    [boundaries, leaveHistoryView, resumeLoop],
  )

  const handlePlayerAction = useCallback((action: PlayerAction) => {
    humanAgentRef.current?.submitAction(action)
  }, [])

  const isHumanTurn = turnManagerRef.current?.['agents']?.[turn] instanceof HumanAgent
  const boardInteractive = !frozen && isHumanTurn

  const onTurnEnd = useCallback(() => {
    if (phase !== 'playing') return
    setTimeout(() => {
      if (live.finished) setPhase('finished')
    }, 0)
  }, [phase, live, setPhase])

  // Turn timer. Runs only while the game is live and unfrozen; the cleanup folds
  // the elapsed segment back so pausing/scrubbing does not lose or reset time.
  useEffect(() => {
    if (phase !== 'playing' || frozen) return
    if (turnStartRef.current === null) turnStartRef.current = Date.now()
    let frame: number
    let stopped = false
    const update = () => {
      if (stopped) return
      const running = turnStartRef.current === null ? 0 : Date.now() - turnStartRef.current
      setTimeLeft(Math.max(0, turnTimeLimit - elapsedRef.current - running))
      frame = requestAnimationFrame(update)
    }
    frame = requestAnimationFrame(update)
    return () => {
      stopped = true
      cancelAnimationFrame(frame)
      if (turnStartRef.current !== null) {
        elapsedRef.current += Date.now() - turnStartRef.current
        turnStartRef.current = null
      }
    }
  }, [phase, frozen])

  // Keep the agent-side turn deadline in step with the on-screen clock.
  useEffect(() => {
    const tm = turnManagerRef.current
    if (!tm) return
    if (frozen) tm.pause()
    else tm.resume()
  }, [frozen])

  useEffect(() => {
    if (phase === 'finished') {
      turnStartRef.current = null
      elapsedRef.current = 0
      setTimeLeft(0)
      setPaused(false)
    }
  }, [phase])

  // 每當遊戲狀態變化時檢查是否需要結束回合
  useEffect(() => {
    if (previewValue !== null) return
    onTurnEnd()
  }, [onTurnEnd, turn, phase, result, live, previewValue])

  // --- series tally ---
  const { colorToName, pvpNames, pvpWins, pvpDraws, aiWins, resetSeries } = useMatch()

  useEffect(() => {
    if (phase !== 'finished' || previewValue !== null) return
    const s = useGame.getState()
    const finalResult = s.result ?? checkGameEnd(s.board, [...PLAYER_LIST])
    useMatch.getState().recordResult(gameMode, finalResult, s.humanSide)
  }, [phase, previewValue, gameMode])

  const names = useMemo<Record<Player, string>>(() => {
    if (gameMode !== 'ai') return colorToName
    const you = t('game.you', 'You')
    const ai = t('game.ai', 'AI')
    return aiSide === 'R' ? { R: ai, B: you } : { R: you, B: ai }
  }, [gameMode, aiSide, colorToName, t])

  const wins = useMemo<Record<Player, number>>(() => {
    if (gameMode === 'ai') {
      return aiSide === 'R' ? { R: aiWins.ai, B: aiWins.you } : { R: aiWins.you, B: aiWins.ai }
    }
    return { R: pvpWins[colorToName.R] ?? 0, B: pvpWins[colorToName.B] ?? 0 }
  }, [gameMode, aiSide, aiWins, pvpWins, colorToName])

  // --- rematch ---
  const startNewMatch = useCallback(() => {
    leaveHistoryView()
    elapsedRef.current = 0
    turnStartRef.current = null
    setTimeLeft(turnTimeLimit)
    resetGame()
    // Same-settings rematches do not re-run the setup effect, so do it here.
    setupTurnManager()
  }, [leaveHistoryView, resetGame, setupTurnManager])

  const handlePlayAgain = useCallback(() => {
    if (gameMode === 'pvp') {
      // Colours are chosen before every match.
      setShowColorPick(true)
      return
    }
    useMatch.getState().startMatch()
    startNewMatch()
  }, [gameMode, startNewMatch])

  // --- what is on screen (preview position, or the live one) ---
  const displayPhase = previewSnapshot?.phase ?? phase
  const displayTurn = previewSnapshot?.turn ?? turn
  const displayBoard = previewSnapshot?.board ?? board
  const displaySelected = (previewSnapshot ? previewSnapshot.selected : selected) ?? null
  const displayLegal = previewSnapshot?.legal ?? legal
  // NOTE: `live` stays pinned to the store board — it drives setPhase('finished').
  const displayResult = previewSnapshot
    ? checkGameEnd(previewSnapshot.board, [...PLAYER_LIST])
    : live
  const displayGameResult = previewSnapshot ? previewSnapshot.result : result

  return (
    <div
      className={[
        'flex flex-col items-center gap-4 py-4 min-h-dvh min-w-0',
        'bg-gradient-to-br from-rose-50 via-indigo-50 to-amber-50 dark:from-zinc-900 dark:via-zinc-700 dark:to-zinc-900',
        'transition-color',
        'box-border',
        'p-4 pb-12',
      ].join(' ')}
    >
      <TurnTimer
        timeLeft={timeLeft}
        timeLimit={turnTimeLimit}
        turn={turn}
        phase={phase}
        paused={frozen}
      />
      <Navbar
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        paused={paused}
        canPause={phase === 'playing' && previewValue === null}
        onTogglePause={() => setPaused((p) => !p)}
        onHome={() => {
          const inProgress =
            phase !== 'finished' && board.some((row) => row.some((c) => c.stone !== null))
          if (inProgress) setShowConfirm(true)
          else {
            setGameMode(null)
            resetGame()
          }
        }}
        dark={dark}
        setDark={setDark}
      />
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-800 dark:text-zinc-100 drop-shadow animate-fade-in flex items-center gap-2">
        {displayPhase === 'finished' && displayGameResult ? (
          displayGameResult.tie ? (
            <>{t('game.tie', '🤜🤛 Draw!')}</>
          ) : displayGameResult.winner ? (
            <>
              {t('game.winner', '🥇 Winner:')}
              <span
                className={
                  displayGameResult.winner === 'R'
                    ? 'inline-block w-6 h-6 rounded-full bg-rose-500 dark:bg-rose-400 border-2 border-rose-300 dark:border-rose-500 shadow-sm mx-1 align-middle'
                    : 'inline-block w-6 h-6 rounded-full bg-indigo-500 dark:bg-indigo-400 border-2 border-indigo-300 dark:border-indigo-500 shadow-sm mx-1 align-middle'
                }
                aria-label={names[displayGameResult.winner]}
              />
              <span className="text-xl sm:text-2xl">{names[displayGameResult.winner]}</span>
            </>
          ) : null
        ) : (
          <>
            Wall Go ·{' '}
            {displayPhase === 'placing'
              ? t('game.phase.placing', 'Placement Phase')
              : displayPhase === 'playing'
                ? t('game.phase.playing', 'Action Phase')
                : t('game.phase.finished', 'Scoring Phase')}
          </>
        )}
      </h1>
      <ScoreRow
        phase={displayPhase}
        score={displayResult.score ?? {}}
        names={names}
        wins={wins}
        draws={gameMode === 'ai' ? aiWins.draws : pvpDraws}
        onResetSeries={resetSeries}
      >
        {phase === 'finished' && previewValue === null && (
          <GameButton
            onClick={handlePlayAgain}
            ariaLabel={t('game.again', 'Play Again')}
            variant="success"
          >
            {t('game.again', 'Play Again')}
          </GameButton>
        )}
      </ScoreRow>
      <div
        className={clsx(
          'board-container flex flex-col aspect-ratio-1 items-center w-[min(800px,100dvh-280px)] max-w-[calc(100dvw-32px)] transition-all',
          'relative',
          frozen && 'pointer-events-none',
          previewValue !== null && 'ring-2 ring-amber-400/70 rounded-2xl',
        )}
      >
        <Board
          board={displayBoard}
          phase={displayPhase}
          turn={displayTurn}
          selected={displaySelected}
          legal={displayLegal}
          placeStone={
            !frozen && (phase === 'placing' || isHumanTurn)
              ? (pos) => handlePlayerAction({ type: 'place', pos })
              : undefined
          }
          selectStone={
            boardInteractive && phase === 'playing' ? (pos) => selectStone(pos) : undefined
          }
          moveTo={
            boardInteractive && phase === 'playing'
              ? (pos) => handlePlayerAction({ type: 'move', pos })
              : undefined
          }
          buildWall={
            boardInteractive && phase === 'playing'
              ? (pos, dir) => handlePlayerAction({ type: 'wall', pos, dir })
              : undefined
          }
        />
        {paused && (
          <div className="absolute inset-0 z-30 flex items-center justify-center rounded-2xl bg-zinc-900/40 dark:bg-zinc-950/55 backdrop-blur-[2px] animate-fade-in">
            <span className="px-4 py-2 rounded-xl bg-white/90 dark:bg-zinc-900/90 text-zinc-800 dark:text-zinc-100 text-xl font-extrabold shadow-lg">
              ⏸ {t('game.paused', 'Paused')}
            </span>
          </div>
        )}
      </div>
      <div className="w-[min(800px,100dvh-280px)] max-w-[calc(100dvw-32px)] mt-3">
        <HistorySlider
          total={boundaries.length - 1}
          value={previewValue ?? liveValue}
          previewing={previewValue !== null}
          onChange={(v) => setPreviewValue(v === liveValue ? null : v)}
          onCommit={() => handleJump(previewValue ?? liveValue)}
          onCancel={() => setPreviewValue(null)}
        />
      </div>
      <div className="w-full flex justify-center mt-3 animate-fade-in">
        <GameButton onClick={() => setShowRule(true)} text ariaLabel={t('menu.rule', 'Game Rules')}>
          {t('menu.rule', 'Game Rules')}
        </GameButton>
      </div>
      <ColorPickDialog
        open={showColorPick}
        names={pvpNames}
        onPick={(redName) => {
          setShowColorPick(false)
          const blueName = pvpNames[0] === redName ? pvpNames[1] : pvpNames[0]
          useMatch.getState().startMatch(redName, blueName)
          startNewMatch()
        }}
        onCancel={() => setShowColorPick(false)}
      />
      <ConfirmDialog
        open={showConfirm}
        title={t('menu.home', 'Home')}
        message={t(
          'menu.confirmHome',
          'The game is not finished. Are you sure you want to return to the home screen?\nYour current progress will be lost.',
        )}
        confirmText={t('common.confirm', 'Confirm')}
        cancelText={t('common.cancel', 'Cancel')}
        onConfirm={() => {
          setShowConfirm(false)
          setGameMode(null)
          resetGame()
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  )
}
