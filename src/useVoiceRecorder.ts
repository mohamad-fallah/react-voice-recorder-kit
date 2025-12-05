import { useCallback, useEffect, useRef, useState } from 'react'
import type { UseVoiceRecorderOptions, UseVoiceRecorderReturn, RecorderState } from './types'

const BAR_COUNT = 40

export function useVoiceRecorder(options: UseVoiceRecorderOptions = {}): UseVoiceRecorderReturn {
  const { autoStart = true, onStop, onDelete } = options

  const [isRecording, setIsRecording] = useState(false)
  const [isStopped, setIsStopped] = useState(false)
  const [isTemporaryStopped, setIsTemporaryStopped] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [levels, setLevels] = useState<number[]>(() => Array.from({ length: BAR_COUNT }, () => 0.15))
  const [error, setError] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioFile, setAudioFile] = useState<File | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const animationFrameIdRef = useRef<number | null>(null)
  const frameCountRef = useRef(0)

  const timerRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const pausedTimeRef = useRef<number>(0)

  const lastUrlRef = useRef<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const previousChunksRef = useRef<Blob[]>([])
  const isResumingRef = useRef(false)
  const isRestartingRef = useRef(false)
  const isTemporaryStopRef = useRef(false)

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  const cleanupAudioContext = useCallback(() => {
    if (animationFrameIdRef.current !== null) {
      cancelAnimationFrame(animationFrameIdRef.current)
      animationFrameIdRef.current = null
    }
    frameCountRef.current = 0
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    analyserRef.current = null
    dataArrayRef.current = null
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startRecordingTimer = useCallback(() => {
    startTimeRef.current = Date.now() - pausedTimeRef.current * 1000
    stopTimer()
    timerRef.current = window.setInterval(() => {
      if (startTimeRef.current === null) return
      const diffMs = Date.now() - startTimeRef.current
      setSeconds(Math.floor(diffMs / 1000))
    }, 1000)
  }, [stopTimer])

  const startPlaybackTimer = useCallback(
    (audio: HTMLAudioElement) => {
      setSeconds(0)
      stopTimer()
      timerRef.current = window.setInterval(() => {
        setSeconds(Math.floor(audio.currentTime))
      }, 250)
    },
    [stopTimer]
  )

const animateLevels = useCallback(() => {
  const analyser = analyserRef.current
  const storedArray = dataArrayRef.current

  if (!analyser || !storedArray) return

  const dataArray = new Uint8Array(storedArray)

  const draw = () => {
    analyser.getByteFrequencyData(dataArray)

    const bufferLength = dataArray.length
    let sum = 0
    for (let i = 0; i < bufferLength; i += 1) {
      sum += dataArray[i]
    }

    const avg = sum / bufferLength
    let normalized = (avg / 255) * 3.5
    const minLevel = 0.05
    if (normalized < minLevel) normalized = minLevel
    if (normalized > 1) normalized = 1

    frameCountRef.current += 1
    if (frameCountRef.current >= 5) {
      setLevels((prev) => {
        const next = prev.slice(1)
        next.push(normalized)
        return next
      })
      frameCountRef.current = 0
    }

    animationFrameIdRef.current = requestAnimationFrame(draw)
  }

  draw()
}, [])



  const setupAudioGraph = useCallback(
    (stream: MediaStream) => {
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext

      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()

      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.6
      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      analyserRef.current = analyser
      dataArrayRef.current = dataArray

      source.connect(analyser)

      void audioContext.resume()

      animateLevels()
    },
    [animateLevels]
  )

  const setupPlaybackGraph = useCallback(
    (audio: HTMLAudioElement) => {
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext

      const source = audioContext.createMediaElementSource(audio)
      const analyser = audioContext.createAnalyser()

      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.6
      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      analyserRef.current = analyser
      dataArrayRef.current = dataArray

      source.connect(analyser)
      analyser.connect(audioContext.destination)

      void audioContext.resume()

      animateLevels()
    },
    [animateLevels]
  )

  const internalStartRecording = useCallback(async () => {
    if (typeof window === 'undefined') return

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Browser does not support audio recording.')
      return
    }

    setError(null)
    isResumingRef.current = false

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      previousChunksRef.current = []

      setupAudioGraph(stream)
      startRecordingTimer()

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        cleanupAudioContext()
        cleanupStream()
        stopTimer()
        setIsRecording(false)
        setIsPaused(false)
        pausedTimeRef.current = 0

        if (isResumingRef.current) {
          isResumingRef.current = false
          return
        }

        if (isRestartingRef.current) {
          isRestartingRef.current = false
          return
        }

        if (chunksRef.current.length === 0) return

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })

        if (lastUrlRef.current) {
          URL.revokeObjectURL(lastUrlRef.current)
        }
        const url = URL.createObjectURL(blob)
        lastUrlRef.current = url
        setAudioUrl(url)

        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' })
        setAudioFile(file)

        if (isTemporaryStopRef.current) {
          setIsTemporaryStopped(true)
          setIsStopped(true)
          isTemporaryStopRef.current = false
        } else {
          setIsStopped(true)
          setIsTemporaryStopped(false)
          if (onStop) {
            onStop(file, url)
          }
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      setIsPaused(false)
      setIsStopped(false)
      pausedTimeRef.current = 0
    } catch {
      setError('Microphone access denied or an error occurred.')
      cleanupAudioContext()
      cleanupStream()
      stopTimer()
      setIsRecording(false)
    }
  }, [cleanupAudioContext, cleanupStream, onStop, setupAudioGraph, startRecordingTimer, stopTimer])

  const start = useCallback(() => {
    void internalStartRecording()
  }, [internalStartRecording])

  const handlePause = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current
    if (!mediaRecorder || mediaRecorder.state !== 'recording') return

    try {
      mediaRecorder.pause()
      stopTimer()
      pausedTimeRef.current = seconds
      setIsPaused(true)
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current)
        animationFrameIdRef.current = null
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        void audioContextRef.current.suspend()
      }
      setLevels(Array.from({ length: BAR_COUNT }, () => 0.15))
    } catch {
      setError('Error pausing recording')
    }
  }, [seconds, stopTimer])

  const handleStopTemporary = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      previousChunksRef.current = [...chunksRef.current]
      isTemporaryStopRef.current = true
      mediaRecorder.stop()
      setIsStopped(true)
      setIsPaused(false)
      pausedTimeRef.current = 0
    } else {
      cleanupAudioContext()
      cleanupStream()
      stopTimer()
      setIsRecording(false)
      setIsStopped(true)
      setIsTemporaryStopped(true)
      setIsPaused(false)
      pausedTimeRef.current = 0
    }
  }, [cleanupAudioContext, cleanupStream, stopTimer])

  const handleStop = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      previousChunksRef.current = [...chunksRef.current]
      isTemporaryStopRef.current = false
      mediaRecorder.stop()
      setIsStopped(true)
      setIsTemporaryStopped(false)
      setIsPaused(false)
      pausedTimeRef.current = 0
    } else {
      if (audioUrl && audioFile && onStop) {
        onStop(audioFile, audioUrl)
      }
      cleanupAudioContext()
      cleanupStream()
      stopTimer()
      setIsRecording(false)
      setIsStopped(true)
      setIsTemporaryStopped(false)
      setIsPaused(false)
      pausedTimeRef.current = 0
    }
  }, [cleanupAudioContext, cleanupStream, stopTimer, audioUrl, audioFile, onStop])

  const handlePreviewPlay = useCallback(() => {
    if (!audioUrl) return

    if (!audioRef.current) {
      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.onended = () => {
        setIsPlaying(false)
        stopTimer()
        cleanupAudioContext()
        audio.currentTime = 0
        setSeconds(0)
      }

      audio.onpause = () => {
        setIsPlaying(false)
        stopTimer()
        cleanupAudioContext()
      }

      audio.onplay = () => {
        setIsPlaying(true)
        cleanupAudioContext()
        setupPlaybackGraph(audio)
        startPlaybackTimer(audio)
      }
    }

    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      if (audio.ended || (audio.duration && audio.currentTime >= audio.duration - 0.01)) {
        audio.currentTime = 0
        setSeconds(0)
      }
      void audio.play()
    }
  }, [audioUrl, cleanupAudioContext, isPlaying, setupPlaybackGraph, startPlaybackTimer, stopTimer])

  const handlePlay = useCallback(() => {
    if (!audioUrl) return

    if (!audioRef.current) {
      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.onended = () => {
        setIsPlaying(false)
        stopTimer()
        cleanupAudioContext()
        audio.currentTime = 0
        setSeconds(0)
      }

      audio.onpause = () => {
        setIsPlaying(false)
        stopTimer()
        cleanupAudioContext()
      }

      audio.onplay = () => {
        setIsPlaying(true)
        cleanupAudioContext()
        setupPlaybackGraph(audio)
        startPlaybackTimer(audio)
      }
    }

    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      if (audio.ended || (audio.duration && audio.currentTime >= audio.duration - 0.01)) {
        audio.currentTime = 0
        setSeconds(0)
      }
      void audio.play()
    }
  }, [audioUrl, cleanupAudioContext, isPlaying, setupPlaybackGraph, startPlaybackTimer, stopTimer])

  const handleResume = useCallback(async () => {
    if (typeof window === 'undefined') return

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Browser does not support audio recording.')
      return
    }

    setError(null)
    isResumingRef.current = true

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      chunksRef.current = [...previousChunksRef.current]

      setupAudioGraph(stream)
      startRecordingTimer()

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        cleanupAudioContext()
        cleanupStream()
        stopTimer()
        setIsRecording(false)
        setIsPaused(false)
        pausedTimeRef.current = 0

        if (chunksRef.current.length === 0) return

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })

        if (lastUrlRef.current) {
          URL.revokeObjectURL(lastUrlRef.current)
        }
        const url = URL.createObjectURL(blob)
        lastUrlRef.current = url
        setAudioUrl(url)

        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' })
        setAudioFile(file)

        if (onStop) {
          onStop(file, url)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      setIsPaused(false)
      setIsStopped(false)
      setIsTemporaryStopped(false)
      setIsPlaying(false)
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      pausedTimeRef.current = seconds
      startTimeRef.current = Date.now() - pausedTimeRef.current * 1000
    } catch {
      setError('Microphone access denied or an error occurred.')
      cleanupAudioContext()
      cleanupStream()
      stopTimer()
      setIsRecording(false)
      isResumingRef.current = false
    }
  }, [cleanupAudioContext, cleanupStream, onStop, seconds, setupAudioGraph, startRecordingTimer, stopTimer])

  const handleDelete = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    }
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    cleanupAudioContext()
    cleanupStream()
    stopTimer()
    setIsPlaying(false)
    setIsStopped(true)
    setIsRecording(false)
    setIsPaused(false)
    setSeconds(0)
    pausedTimeRef.current = 0
    setLevels(Array.from({ length: BAR_COUNT }, () => 0.15))
    previousChunksRef.current = []
    chunksRef.current = []
    if (onDelete) {
      onDelete()
    }
  }, [cleanupAudioContext, cleanupStream, onDelete, stopTimer])

  const handleRestart = useCallback(() => {
    isRestartingRef.current = true
    const mediaRecorder = mediaRecorderRef.current
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    }
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    cleanupAudioContext()
    cleanupStream()
    stopTimer()
    setIsRecording(false)
    setIsStopped(false)
    setIsTemporaryStopped(false)
    setIsPaused(false)
    setIsPlaying(false)
    setSeconds(0)
    pausedTimeRef.current = 0
    setLevels(Array.from({ length: BAR_COUNT }, () => 0.15))
    previousChunksRef.current = []
    chunksRef.current = []
    isResumingRef.current = false
    if (lastUrlRef.current) {
      URL.revokeObjectURL(lastUrlRef.current)
      lastUrlRef.current = null
    }
    setAudioUrl(null)
    setAudioFile(null)
    void internalStartRecording()
  }, [cleanupAudioContext, cleanupStream, internalStartRecording, stopTimer])

  useEffect(() => {
    if (autoStart) {
      void internalStartRecording()
    }

    return () => {
      const mediaRecorder = mediaRecorderRef.current
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop()
      }
      cleanupAudioContext()
      cleanupStream()
      stopTimer()

      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }

      if (lastUrlRef.current) {
        URL.revokeObjectURL(lastUrlRef.current)
        lastUrlRef.current = null
      }
    }
  }, [autoStart, cleanupAudioContext, cleanupStream, internalStartRecording, stopTimer])

  const getState = (): RecorderState => {
    if (isPlaying) return 'playing'
    if (isStopped && !isTemporaryStopped && audioUrl) return 'reviewing'
    if (isRecording && isPaused) return 'paused'
    if (isRecording) return 'recording'
    return 'idle'
  }

  const handleRecordAgain = useCallback(() => {
    handleRestart()
  }, [handleRestart])

  return {
    state: getState(),
    isRecording,
    isStopped,
    isTemporaryStopped,
    isPlaying,
    isPaused,
    seconds,
    levels,
    error,
    audioUrl,
    audioFile,
    start,
    handlePause,
    handleStopTemporary,
    handleStop,
    handleResume,
    handlePreviewPlay,
    handlePlay,
    handleRestart,
    handleDelete,
    handleRecordAgain
  }
}
