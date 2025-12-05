# react-voice-recorder-kit

A lightweight, dependency-free React voice recorder library with a simple waveform visualization.

* No UI framework dependencies (pure React + inline CSS)
* Built-in animated waveform (40 bars)
* Ready-to-use component
* Full-featured custom hook
* TypeScript support included
* Works in Next.js, Vite, CRA, etc.

---

## Installation

```bash
npm install react-voice-recorder-kit
# or
pnpm add react-voice-recorder-kit
# or
yarn add react-voice-recorder-kit
```

Requires **React 18+**

---

## Quick Start (Component Usage)

```tsx
'use client'

import { useState } from 'react'
import { VoiceRecorder } from 'react-voice-recorder-kit'

export default function Page() {
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState<string | null>(null)

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: '0 auto' }}>
      <h1>React Voice Recorder Kit</h1>

      <VoiceRecorder
        autoStart={false}
        onStop={(audioFile, audioUrl) => {
          setFile(audioFile)
          setUrl(audioUrl)
        }}
        onDelete={() => {
          setFile(null)
          setUrl(null)
        }}
      />

      {url && (
        <div style={{ marginTop: 16 }}>
          <audio controls src={url} style={{ width: '100%' }} />
          {file && (
            <p style={{ fontSize: 12, marginTop: 8 }}>
              File name: {file.name} | size: {file.size} bytes
            </p>
          )}
        </div>
      )}
    </div>
  )
}
```

---

## Usage in Next.js (App Router)

```tsx
'use client'

import { VoiceRecorder } from 'react-voice-recorder-kit'

export default function VoicePage() {
  return (
    <div style={{ padding: 24 }}>
      <VoiceRecorder autoStart={true} />
    </div>
  )
}
```

---

## Component API

```ts
type VoiceRecorderProps = {
  autoStart?: boolean
  onStop?: (file: File, url: string) => void
  onDelete?: () => void
}
```

| Prop      | Type                              | Default   | Description                            |
| --------- | --------------------------------- | --------- | -------------------------------------- |
| autoStart | boolean                           | true      | Automatically start recording on mount |
| onStop    | (file: File, url: string) => void | undefined | Callback after recording stops         |
| onDelete  | () => void                        | undefined | Callback after recording is deleted    |

---

## Hook Usage (useVoiceRecorder)

If you want full control over UI, use the hook directly.

### Import

```ts
import { useVoiceRecorder } from 'react-voice-recorder-kit'
```

### Options

```ts
type UseVoiceRecorderOptions = {
  autoStart?: boolean
  onStop?: (file: File, url: string) => void
  onDelete?: () => void
}
```

### Returned Values

```ts
type UseVoiceRecorderReturn = {
  isRecording: boolean
  isStopped: boolean
  isPlaying: boolean
  isPaused: boolean
  seconds: number
  levels: number[]
  error: string | null
  audioUrl: string | null
  audioFile: File | null
  start: () => void
  togglePause: () => void
  stop: () => void
  togglePlay: () => void
  deleteRecording: () => void
}
```

---

## Full Example Using Hook (Custom UI)

```tsx
'use client'

import { useVoiceRecorder } from 'react-voice-recorder-kit'

export default function CustomRecorder() {
  const {
    isRecording,
    isPaused,
    isStopped,
    isPlaying,
    seconds,
    levels,
    audioUrl,
    audioFile,
    error,
    start,
    togglePause,
    stop,
    togglePlay,
    deleteRecording
  } = useVoiceRecorder({ autoStart: false })

  return (
    <div style={{ padding: 16, maxWidth: 600 }}>
      <h2>Custom Voice Recorder</h2>

      <div style={{ marginBottom: 8 }}>
        Time: {seconds}s
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={start} disabled={isRecording}>Start</button>
        <button onClick={togglePause} disabled={!isRecording && !isPaused}>
          {isPaused ? 'Resume' : 'Pause'}
        </button>
        <button onClick={stop} disabled={isStopped}>Stop</button>
        <button onClick={togglePlay} disabled={!audioUrl}>
          {isPlaying ? 'Pause Playback' : 'Play'}
        </button>
        <button onClick={deleteRecording} disabled={!audioFile}>Delete</button>
      </div>

      {error && (
        <div style={{ color: 'red', marginTop: 8 }}>
          {error}
        </div>
      )}

      <div
        style={{
          marginTop: 20,
          height: 40,
          display: 'flex',
          alignItems: 'flex-end',
          gap: 4,
          overflow: 'hidden'
        }}
      >
        {levels.map((level, index) => {
          const height = 5 + level * 35
          return (
            <div
              key={index}
              style={{
                width: 4,
                height,
                borderRadius: 4,
                background: '#444'
              }}
            />
          )}
        )}
      </div>

      {audioUrl && (
        <div style={{ marginTop: 16 }}>
          <audio controls src={audioUrl} style={{ width: '100%' }} />
        </div>
      )}
    </div>
  )
}
```

---

## License

MIT
