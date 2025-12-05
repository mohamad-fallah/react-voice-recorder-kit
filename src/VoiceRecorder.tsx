import type { FC, CSSProperties } from 'react'
import { useMemo, useRef, useEffect, useState } from 'react'
import { useVoiceRecorder } from './useVoiceRecorder'
import type { UseVoiceRecorderOptions } from './useVoiceRecorder'
import { PlayIcon, PauseIcon, StopIcon, DeleteIcon, RepeatIcon } from './icons'

export type VoiceRecorderProps = UseVoiceRecorderOptions & {
  width?: string | number
  height?: string | number
  style?: CSSProperties
}

const VoiceRecorder: FC<VoiceRecorderProps> = (props) => {
  const { width, height, style, ...recorderOptions } = props
  const {
    isRecording,
    isStopped,
    isPlaying,
    isPaused,
    seconds,
    levels,
    error,
    togglePause,
    stop,
    togglePlay,
    deleteRecording,
    restart
  } = useVoiceRecorder(recorderOptions)

  const containerRef = useRef<HTMLDivElement>(null)
  const [visualizerWidth, setVisualizerWidth] = useState(0)

  const visualizerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const updateWidth = () => {
      if (visualizerRef.current) {
        const availableWidth = visualizerRef.current.offsetWidth
        setVisualizerWidth(Math.max(0, availableWidth))
      }
    }

    updateWidth()
    const resizeObserver = new ResizeObserver(updateWidth)
    if (visualizerRef.current) {
      resizeObserver.observe(visualizerRef.current)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [width, isStopped, error])

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }, [seconds])

  const barWidth = 3
  const barGap = 4
  const maxBars = useMemo(() => {
    if (visualizerWidth <= 0) {
      return Math.max(levels.length, 40)
    }
    const calculatedBars = Math.floor(visualizerWidth / (barWidth + barGap))
    return Math.max(calculatedBars, 1)
  }, [visualizerWidth, levels.length])

  const displayedLevels = useMemo(() => {
    if (maxBars <= 0 || levels.length === 0) {
      return Array.from({ length: Math.max(maxBars, 40) }, () => 0.15)
    }
    
    if (maxBars <= levels.length) {
      const step = levels.length / maxBars
      return Array.from({ length: maxBars }, (_, i) => {
        const start = Math.floor(i * step)
        const end = Math.floor((i + 1) * step)
        const slice = levels.slice(start, end)
        return slice.length > 0 ? Math.max(...slice) : 0.15
      })
    }
    
    const step = (levels.length - 1) / (maxBars - 1)
    return Array.from({ length: maxBars }, (_, i) => {
      const position = i * step
      const lowerIndex = Math.floor(position)
      const upperIndex = Math.min(Math.ceil(position), levels.length - 1)
      const fraction = position - lowerIndex
      
      if (lowerIndex === upperIndex) {
        return levels[lowerIndex] || 0.15
      }
      
      return (levels[lowerIndex] || 0.15) * (1 - fraction) + (levels[upperIndex] || 0.15) * fraction
    })
  }, [levels, maxBars])

  const containerStyle: CSSProperties = useMemo(() => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderRadius: 4,
    border: '1px solid #e5e7eb',
    padding: '6px 10px',
    width: width ?? '100%',
    height: height,
    boxSizing: 'border-box',
    ...style
  }), [width, height, style])

  return (
    <div ref={containerRef} style={containerStyle}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 9999,
          backgroundColor: isRecording ? '#ef4444' : '#9ca3af'
        }}
      />
      <span
        style={{
          fontSize: 12,
          fontWeight: 500,
          minWidth: 40,
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
        }}
      >
        {formattedTime}
      </span>
      <div
        ref={visualizerRef}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: barGap,
          overflow: 'hidden',
          height: 40,
          minWidth: 0,
          justifyContent: 'flex-start'
        }}
      >
        {displayedLevels.map((level, index) => {
          const clamped = Math.max(0.1, Math.min(level, 1))
          const barHeight = 1 + clamped * 35
          return (
            <span
              key={index}
              style={{
                width: barWidth,
                borderRadius: 999,
                backgroundColor: '#4b5563',
                height: barHeight,
                flexShrink: 0
              }}
            />
          )
        })}
      </div>

      {!isStopped && (
        <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
          <button
            type="button"
            onClick={togglePause}
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              border: '1px solid #e5e7eb',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              cursor: 'pointer'
            }}
          >
            {isPaused ? <PlayIcon /> : <PauseIcon />}
          </button>
          {isPaused && (
            <button
              type="button"
              onClick={restart}
              style={{
                width: 28,
                height: 28,
                borderRadius: 999,
                border: '1px solid #e5e7eb',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                cursor: 'pointer'
              }}
            >
              <RepeatIcon />
            </button>
          )}
          <button
            type="button"
            onClick={stop}
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              border: '1px solid #e5e7eb',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              cursor: 'pointer'
            }}
          >
            <StopIcon />
          </button>
        </div>
      )}

      {isStopped && (
        <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
          <button
            type="button"
            onClick={togglePlay}
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              border: '1px solid #e5e7eb',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              cursor: 'pointer'
            }}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button
            type="button"
            onClick={deleteRecording}
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              border: '1px solid #e5e7eb',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              cursor: 'pointer',
              color: '#ef4444'
            }}
          >
            <DeleteIcon />
          </button>
        </div>
      )}

      {error && (
        <span
          style={{
            color: '#dc2626',
            fontSize: 10,
            marginLeft: 8,
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
          }}
        >
          {error}
        </span>
      )}
    </div>
  )
}

export default VoiceRecorder
