# react-voice-recorder-kit

A lightweight React voice recorder library with waveform visualization and no UI framework dependencies.

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
  width?: string | number
  height?: string | number
  style?: CSSProperties
}
```

| Prop      | Type                              | Default   | Description                            |
| --------- | --------------------------------- | --------- | -------------------------------------- |
| autoStart | boolean                           | true      | Automatically start recording on mount |
| onStop    | (file: File, url: string) => void | undefined | Callback after recording stops         |
| onDelete  | () => void                        | undefined | Callback after recording is deleted    |
| width     | string \| number                  | '100%'    | Component width                        |
| height    | string \| number                  | undefined | Component height                       |
| style     | CSSProperties                    | undefined | Additional styles for container        |

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
  restart: () => void
}
```

| Property        | Type           | Description                                    |
| --------------- | -------------- | ---------------------------------------------- |
| isRecording     | boolean        | Whether recording is active                     |
| isStopped       | boolean        | Whether recording has stopped                   |
| isPlaying       | boolean        | Whether playback is active                      |
| isPaused        | boolean        | Whether recording is paused                     |
| seconds         | number         | Time in seconds                                 |
| levels          | number[]       | Array of 40 audio levels (0 to 1)               |
| error           | string \| null | Error message if any                            |
| audioUrl        | string \| null | URL of the recorded audio file                  |
| audioFile       | File \| null   | Recorded audio file                             |
| start           | () => void     | Start recording                                 |
| togglePause     | () => void     | Pause or resume recording                       |
| stop            | () => void     | Stop recording                                  |
| togglePlay      | () => void     | Play or pause playback of recorded file         |
| deleteRecording | () => void     | Delete recording and reset to initial state     |
| restart         | () => void     | Restart recording (only available when paused)  |

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
    deleteRecording,
    restart
  } = useVoiceRecorder({ autoStart: false })

  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60)
    const sec = secs % 60
    return `${minutes}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div style={{ padding: 16, maxWidth: 600 }}>
      <h2>Custom Voice Recorder</h2>

      <div style={{ marginBottom: 8 }}>
        Time: {formatTime(seconds)}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={start} disabled={isRecording}>
          Start
        </button>
        <button onClick={togglePause} disabled={!isRecording && !isPaused}>
          {isPaused ? 'Resume' : 'Pause'}
        </button>
        {isPaused && (
          <button onClick={restart}>
            Restart
          </button>
        )}
        <button onClick={stop} disabled={isStopped}>
          Stop
        </button>
        <button onClick={togglePlay} disabled={!audioUrl}>
          {isPlaying ? 'Pause Playback' : 'Play'}
        </button>
        <button onClick={deleteRecording} disabled={!audioFile}>
          Delete
        </button>
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
          )
        })}
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

## Features

* Voice recording using MediaRecorder API
* Animated waveform visualization during recording and playback
* Pause/resume support
* Playback support for recorded files
* Time display in MM:SS format
* Error handling and error message display
* Ready-to-use UI with control buttons
* Customizable style and size
* No external dependencies

---

## License

MIT
