// Copyright 2024 Google LLC

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     https://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {useCallback, useEffect, useState, useMemo} from 'react'
import c from 'classnames'
import {timeToSecs} from './utils'
import {useRef} from 'react'

const formatTime = t =>
  `${Math.floor(t / 60)}:${Math.floor(t % 60)
    .toString()
    .padStart(2, '0')}`

const PLAYBACK_RATES = [0.5, 1, 1.5, 2]
export default function VideoPlayer({
  url,
  timecodeList,
  requestedTimecode,
  isLoadingVideo,
  videoError,
  uploadStatus,
  processingError,
  jumpToTimecode
}) {
  const [video, setVideo] = useState(null)
  const [duration, setDuration] = useState(0)
  const [scrubberTime, setScrubberTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [currentCaption, setCurrentCaption] = useState(null)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [error, setError] = useState(null)
  const containerRef = useRef(null)

  const currentSecs = duration * scrubberTime || 0
  const currentPercent = scrubberTime * 100
  const timecodeListReversed = useMemo(
    () => timecodeList?.toReversed(),
    [timecodeList]
  )

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (err) {
      setError('Fullscreen not supported')
    }
  }, [])

  const handlePlaybackRate = () => {
    const currentIndex = PLAYBACK_RATES.indexOf(playbackRate)
    const nextRate = PLAYBACK_RATES[(currentIndex + 1) % PLAYBACK_RATES.length]
    setPlaybackRate(nextRate)
    if (video) {
      video.playbackRate = nextRate
    }
  }
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      video.pause()
    } else {
      video.play()
    }
  }, [isPlaying, video])

  const updateDuration = () => setDuration(video.duration)

  const updateTime = () => {
    if (!isScrubbing) {
      setScrubberTime(video.currentTime / video.duration)
    }

    if (timecodeList) {
      setCurrentCaption(
        timecodeListReversed.find(t => timeToSecs(t.time) <= video.currentTime)
          ?.text
      )
    }
  }

  const onPlay = () => setIsPlaying(true)
  const onPause = () => setIsPlaying(false)
  const onError = () => setError('Error playing video')

  useEffect(() => {
    setScrubberTime(0)
    setIsPlaying(false)
    setError(null)
  }, [url])

  useEffect(() => {
    if (video && requestedTimecode !== null) {
      video.currentTime = requestedTimecode
    }
  }, [video, requestedTimecode])

  useEffect(() => {
    const onKeyPress = e => {
      if (
        e.target.tagName !== 'INPUT' &&
        e.target.tagName !== 'TEXTAREA' &&
        e.key === ' '
      ) {
        togglePlay()
      }
    }

    addEventListener('keypress', onKeyPress)

    return () => {
      removeEventListener('keypress', onKeyPress)
    }
  }, [togglePlay])

  return (
    <div className={c('videoPlayer', {fullscreen: isFullscreen})} ref={containerRef}>
      {url && !isLoadingVideo ? (
        <>
          <div>
            <video
              src={url}
              ref={setVideo}
              onClick={togglePlay}
              preload="auto"
              crossOrigin="anonymous"
              onDurationChange={updateDuration}
              onTimeUpdate={updateTime}
              onPlay={onPlay}
              onPause={onPause}
              onError={onError}
              playbackRate={playbackRate}
            />

            {currentCaption && (
              <div className="videoCaption">{currentCaption}</div>
            )}
            
            {error && (
              <div className="videoError">
                <span className="icon">error</span>
                {error}
              </div>
            )}
          </div>

          <div className="videoControls">
            <div className="videoScrubber">
              <input
                style={{'--pct': `${currentPercent}%`}}
                type="range"
                min="0"
                max="1"
                value={scrubberTime || 0}
                step="0.000001"
                onChange={e => {
                  setScrubberTime(e.target.valueAsNumber)
                  video.currentTime = e.target.valueAsNumber * duration
                }}
                onPointerDown={() => setIsScrubbing(true)}
                onPointerUp={() => setIsScrubbing(false)}
              />
            </div>
            <div className="timecodeMarkers">
              {timecodeList?.map(({time, text, value}, i) => {
                const secs = timeToSecs(time)
                const pct = (secs / duration) * 100

                return (
                  <div
                    className="timecodeMarker"
                    key={i}
                    style={{left: `${pct}%`}}
                  >
                    <div
                      className="timecodeMarkerTick"
                      onClick={() => jumpToTimecode(secs)}
                    >
                      <div />
                    </div>
                    <div
                      className={c('timecodeMarkerLabel', {right: pct > 50})}
                    >
                      <div>{time}</div>
                      <p>{value || text}</p>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="videoTime">
              <div className="videoControls-left">
                <button onClick={togglePlay}>
                <span className="icon" onClick={togglePlay}>
                  {isPlaying ? 'pause' : 'play_arrow'}
                </span>
                </button>
                <span className="videoTime-display">
                  {formatTime(currentSecs)} / {formatTime(duration)}
                </span>
              </div>
              <div className="videoControls-right">
                <button onClick={handlePlaybackRate} title="Playback speed">
                  <span className="playbackRate">{playbackRate}x</span>
                </button>
                <button onClick={toggleFullscreen} title="Toggle fullscreen">
                  <span className="icon">
                    {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="emptyVideo">
          <div className="uploadMessage" role="status" aria-live="polite">
            {isLoadingVideo && uploadStatus ? (
              <>
                {uploadStatus}
                <div className="processingSpinner" />
              </>
            ) : videoError ? (
              <div className="errorMessage">
                <span className="icon">error</span>
                {processingError || 'Error processing video.'}
              </div>
            ) : (
              <>
                <span className="icon">upload_file</span>
                Drag and drop a video file here to get started
                <div className="supportedFormats">
                  <div>Supported formats: MP4, WebM, MOV, QuickTime</div>
                  <div className="size-limit">
                    <span className="icon">warning</span>
                    Maximum file size: 10GB
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
