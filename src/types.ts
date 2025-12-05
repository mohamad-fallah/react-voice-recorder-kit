import type { CSSProperties } from 'react'

export type RecorderState = 'idle' | 'recording' | 'paused' | 'reviewing' | 'playing'

export type UseVoiceRecorderOptions = {
  autoStart?: boolean
  onStop?: (file: File, url: string) => void
  onDelete?: () => void
}

export type UseVoiceRecorderReturn = {
  state: RecorderState
  isRecording: boolean
  isStopped: boolean
  isTemporaryStopped: boolean
  isPlaying: boolean
  isPaused: boolean
  seconds: number
  levels: number[]
  error: string | null
  audioUrl: string | null
  audioFile: File | null
  start: () => void
  handlePause: () => void
  handleStopTemporary: () => void
  handleStop: () => void
  handleResume: () => void
  handlePreviewPlay: () => void
  handlePlay: () => void
  handleRestart: () => void
  handleDelete: () => void
  handleRecordAgain: () => void
}

export type VoiceRecorderProps = UseVoiceRecorderOptions & {
  width?: string | number
  height?: string | number
  style?: CSSProperties
}

