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

import {useRef, useState, useEffect} from 'react'
import c from 'classnames'
import Layout from './components/Layout'
import VideoPlayer from './VideoPlayer.jsx'
import Chart from './Chart.jsx'
import modes from './modes'
import {timeToSecs} from './utils'
import {createChunkGenerator, uploadChunk, MAX_FILE_SIZE} from './utils'
import Chat from './Chat.jsx'
import generateContent from './api'
import functions from './functions'
import FileSystem from './components/FileSystem.jsx'
import Collaboration from './components/Collaboration.jsx'
import AdvancedProcessing from './components/AdvancedProcessing.jsx'

const chartModes = Object.keys(modes.Chart.subModes)

export default function App() {
  const [vidUrl, setVidUrl] = useState(null)
  const [file, setFile] = useState(null)
  const [timecodeList, setTimecodeList] = useState(null)
  const [requestedTimecode, setRequestedTimecode] = useState(null)
  const [selectedMode, setSelectedMode] = useState(Object.keys(modes)[0])
  const [activeMode, setActiveMode] = useState()
  const [isLoading, setIsLoading] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [isLoadingVideo, setIsLoadingVideo] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [processingError, setProcessingError] = useState(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const [chartMode, setChartMode] = useState(chartModes[0])
  const [chartPrompt, setChartPrompt] = useState('')
  const [chartLabel, setChartLabel] = useState('')
  const [showChat, setShowChat] = useState(false)
  const [showCollaboration, setShowCollaboration] = useState(false)
  const [showProcessing, setShowProcessing] = useState(false)
  const [theme] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  )
  const scrollRef = useRef()
  const isCustomMode = selectedMode === 'Custom'
  const isChartMode = selectedMode === 'Chart'
  const isCustomChartMode = isChartMode && chartMode === 'Custom'
  const hasSubMode = isCustomMode || isChartMode

  const setTimecodes = ({timecodes}) =>
    setTimecodeList(
      timecodes.map(t => ({...t, text: t.text.replaceAll("\\'", "'")}))
    )

  const onModeSelect = async mode => {
    setActiveMode(mode)
    setIsLoading(true)
    setChartLabel(chartPrompt)

    const resp = await generateContent({
      text: isCustomMode
        ? modes[mode].prompt(customPrompt)
        : isChartMode
        ? modes[mode].prompt(
            isCustomChartMode ? chartPrompt : modes[mode].subModes[chartMode]
          )
        : modes[mode].prompt,
      file,
      functionDeclarations: functions({
        set_timecodes: setTimecodes,
        set_timecodes_with_objects: setTimecodes,
        set_timecodes_with_numeric_values: ({timecodes}) =>
          setTimecodeList(timecodes)
      })
    })

    const call = resp.functionCalls()[0]

    if (call) {
      ;({
        set_timecodes: setTimecodes,
        set_timecodes_with_objects: setTimecodes,
        set_timecodes_with_numeric_values: ({timecodes}) =>
          setTimecodeList(timecodes)
      })[call.name](call.args)
    }

    setIsLoading(false)
    scrollRef.current.scrollTo({top: 0})
  }

  const uploadVideo = async e => {
    e.preventDefault()
    e.stopPropagation()
    console.log('Starting video upload process')
    
    setIsLoadingVideo(true)
    setProcessingError(null)
    setVideoError(false)
    setFile(null)
    setUploadStatus('Uploading video...')
    
    const videoFile = e.dataTransfer?.files?.[0]
    if (!videoFile) {
      console.error('Upload failed: No file selected')
      setProcessingError('No file selected')
      setIsLoadingVideo(false)
      return
    }

    console.log('File details:', {
      name: videoFile.name,
      type: videoFile.type,
      size: videoFile.size
    })

    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/mov']
    if (!validTypes.includes(videoFile.type)) {
      console.error('Upload failed: Invalid file type', {
        provided: videoFile.type,
        allowed: validTypes
      })
      setProcessingError('Invalid file type. Please upload an MP4, WebM, MOV, or QuickTime video.')
      setIsLoadingVideo(false)
      return
    }

    // Validate file size (100MB limit)
    if (videoFile.size > MAX_FILE_SIZE) {
      console.error('Upload failed: File too large', {
        size: videoFile.size,
        maxSize: MAX_FILE_SIZE,
        sizeMB: Math.round(videoFile.size / (1024 * 1024))
      })
      const fileSizeMB = Math.round(videoFile.size / (1024 * 1024))
      setProcessingError(
        <>
          File size exceeds limit
          <span className="size-details">
            Current file: {fileSizeMB.toLocaleString()}MB
            <br />
            Maximum allowed: 10GB
          </span>
        </>
      )
      setIsLoadingVideo(false)
      return
    }

    setVidUrl(URL.createObjectURL(videoFile))

    try {
      // Initialize upload
      console.log('Initializing upload:', videoFile.name)
      const response = await fetch('/api/upload/init', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          fileName: videoFile.name,
          fileType: videoFile.type,
          fileSize: videoFile.size
        })
      })

      if (!response.ok) {
        throw new Error('Failed to initialize upload')
      }

      const {fileId} = await response.json()
      console.log('Upload initialized:', {fileId})

      // Upload chunks
      let uploadedChunks = 0
      const chunkGenerator = createChunkGenerator(videoFile)
      
      for await (const {chunk, index, offset, total} of chunkGenerator) {
        try {
          await uploadChunk({
            chunk,
            index,
            offset,
            fileId,
            fileName: videoFile.name,
            fileType: videoFile.type
          })
          
          uploadedChunks++
          const progress = Math.round((uploadedChunks / total) * 100)
          setUploadStatus(`Uploading: ${progress}%`)
          console.log('Chunk uploaded:', {index, progress})
        } catch (error) {
          console.error('Chunk upload failed:', {index, error})
          throw new Error(`Failed to upload chunk ${index}: ${error.message}`)
        }
      }

      // Complete upload
      console.log('Finalizing upload:', fileId)
      const resp = await fetch(`/api/upload/complete/${fileId}`).then(r => r.json())
      if (resp.error) {
        throw new Error(resp.error)
      }

      console.log('Upload successful, starting progress monitoring')
      setFile(resp.data)
      
      // Save video to library
      const videoInfo = {
        fileId: resp.data.name,
        fileName: videoFile.name,
        path: '/',
        fileSize: videoFile.size,
        uploadDate: new Date().toISOString(),
        status: 'PROCESSING'
      }
      
      const existingVideos = JSON.parse(localStorage.getItem('uploadedVideos') || '[]')
      localStorage.setItem('uploadedVideos', JSON.stringify([...existingVideos, videoInfo]))
      
      checkProgress(resp.data.name)
    } catch (error) {
      console.error('Upload error:', {
        message: error.message,
        stack: error.stack,
        details: error
      })
      setVidUrl(null)
      setProcessingError(error.message)
      setIsLoadingVideo(false)
      setUploadStatus('')
    }
  }

  const checkProgress = async fileId => {
    let progressMessage = 'Processing video...'
    let retries = 0
    console.log('Checking upload progress:', {fileId, retries})

    try {
      const response = await fetch('/api/progress', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({fileId})
      })
      console.log('Progress response status:', response.status)
      console.log('Progress response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })

      if (!response.ok) {
        console.error('Progress check request failed:', response.statusText)
        throw new Error(`Progress check failed: ${response.statusText}`)
      }

      const resp = await response.json()
      if (resp.error) {
        console.error('Progress check response contained error:', resp.error)
        throw new Error(resp.error)
      }
      console.log('Progress check result:', {
        state: resp.progress.state,
        progress: resp.progress.progress,
        metadata: resp.progress.metadata
      })

      switch (resp.progress.state) {
        case 'ACTIVE':
          console.log('Video processing complete')
          // Update video status in library
          const videos = JSON.parse(localStorage.getItem('uploadedVideos') || '[]')
          const updatedVideos = videos.map(v => 
            v.fileId === fileId ? {...v, status: 'ACTIVE'} : v
          )
          localStorage.setItem('uploadedVideos', JSON.stringify(updatedVideos))
          setIsLoadingVideo(false)
          setUploadStatus('')
          break
        case 'FAILED':
          console.error('Video processing failed:', resp.progress.error)
          throw new Error(resp.progress.error || 'Video processing failed')
        case 'PROCESSING':
          progressMessage = `Processing: ${resp.progress.progress || 0}%`
          setUploadStatus(progressMessage)
          console.log('Video still processing:', {
            progress: resp.progress.progress,
            retries
          })
          if (retries < 60) { // Limit retries to 1 minute
            setTimeout(() => {
              retries++
              checkProgress(fileId)
            }, 1000)
          } else {
            console.error('Video processing timeout')
            throw new Error('Processing timeout. Please try again.')
          }
          break
        default:
          console.log('Unknown progress state, retrying')
          setTimeout(() => checkProgress(fileId), 1000)
      }
    } catch (error) {
      console.error('Progress check error:', {
        message: error.message,
        stack: error.stack,
        details: error,
        retries
      })
      setProcessingError(error.message)
      setVideoError(true)
      setIsLoadingVideo(false)
      setUploadStatus('')
    }
  }

  return (
    <Layout>
      <div 
        role="presentation"
        aria-label="Video upload area"
        className="videoContainer"
      onDrop={uploadVideo}
      onDragOver={e => e.preventDefault()}
      onDragEnter={() => {}}
      onDragLeave={() => {}}
    >
      <section className="top">
        {vidUrl && !isLoadingVideo && (
          <>
            <div className={c('modeSelector', {hide: !showSidebar})}>
              {hasSubMode ? (
                <>
                  <div>
                    {isCustomMode ? (
                      <>
                        <h2>Custom prompt:</h2>
                        <textarea
                          placeholder="Type a custom prompt..."
                          value={customPrompt}
                          onChange={e => setCustomPrompt(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              onModeSelect(selectedMode)
                            }
                          }}
                          rows="5"
                        />
                      </>
                    ) : (
                      <>
                        <h2>Chart this video by:</h2>

                        <div className="modeList">
                          {chartModes.map(mode => (
                            <button
                              key={mode}
                              className={c('button', {
                                active: mode === chartMode
                              })}
                              onClick={() => setChartMode(mode)}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                        <textarea
                          className={c({active: isCustomChartMode})}
                          placeholder="Or type a custom prompt..."
                          value={chartPrompt}
                          onChange={e => setChartPrompt(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              onModeSelect(selectedMode)
                            }
                          }}
                          onFocus={() => setChartMode('Custom')}
                          rows="2"
                        />
                      </>
                    )}
                    <button
                      className="button generateButton"
                      onClick={() => onModeSelect(selectedMode)}
                      disabled={
                        (isCustomMode && !customPrompt.trim()) ||
                        (isChartMode &&
                          isCustomChartMode &&
                          !chartPrompt.trim())
                      }
                    >
                      ▶️ Generate
                    </button>
                  </div>
                  <div className="backButton">
                    <button
                      onClick={() => setSelectedMode(Object.keys(modes)[0])}
                    >
                      <span className="icon">chevron_left</span>
                      Back
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h2>Explore this video via:</h2>
                    <div className="modeList">
                      {Object.entries(modes).map(([mode, {emoji}]) => (
                        <button
                          key={mode}
                          className={c('button', {
                            active: mode === selectedMode
                          })}
                          onClick={() => setSelectedMode(mode)}
                        >
                          <span className="emoji">{emoji}</span> {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <button
                      className="button generateButton"
                      onClick={() => onModeSelect(selectedMode)}
                    >
                      ▶️ Generate
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              className="collapseButton"
              onClick={() => setShowSidebar(!showSidebar)}
            >
              <span className="icon">
                {showSidebar ? 'chevron_left' : 'chevron_right'}
              </span>
            </button>
          </>
        )}
        
        <button
          className="chatToggle"
          onClick={() => setShowChat(!showChat)}
          title="AI Chat"
        >
          <span className="icon">{showChat ? 'close' : 'chat'}</span>
        </button>
        
        <button
          className="chatToggle collaboration"
          onClick={() => setShowCollaboration(!showCollaboration)}
          title="Collaboration"
          style={{bottom: '90px'}}
        >
          <span className="icon">group</span>
        </button>

        <button
          className="chatToggle processing"
          onClick={() => setShowProcessing(!showProcessing)}
          title="Advanced Processing"
          style={{bottom: '160px'}}
        >
          <span className="icon">psychology</span>
        </button>

        <VideoPlayer
          url={vidUrl}
          requestedTimecode={requestedTimecode}
          timecodeList={timecodeList}
          jumpToTimecode={setRequestedTimecode}
          isLoadingVideo={isLoadingVideo}
          videoError={videoError}
          uploadStatus={uploadStatus}
          processingError={processingError}
        />
      </section>

      <div className={c('tools', {inactive: !vidUrl})}>
        {showChat && (
          <Chat
            onClose={() => setShowChat(false)}
            videoFile={file}
            isVideoLoaded={!!vidUrl && !isLoadingVideo}
          />
        )}
        
        {showCollaboration && (
          <Collaboration
            videoFile={file}
          />
        )}

        {showProcessing && (
          <AdvancedProcessing
            videoFile={file}
          />
        )}
        
        <FileSystem />
        
        <section
          className={c('output', {['mode' + activeMode]: activeMode})}
          ref={scrollRef}
        >
        {isLoading ? (
          <div className="loading">
            Waiting for model<span>...</span>
          </div>
        ) : timecodeList ? (
            activeMode === 'Table' ? (
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Description</th>
                    <th>Objects</th>
                  </tr>
                </thead>
                <tbody>
                  {timecodeList.map(({time, text, objects}, i) => (
                    <tr
                      key={i}
                      role="button"
                      onClick={() => setRequestedTimecode(timeToSecs(time))}
                    >
                      <td>
                        <time>{time}</time>
                      </td>
                      <td>{text}</td>
                      <td>{objects.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : activeMode === 'Chart' ? (
              <Chart
                data={timecodeList}
                yLabel={chartLabel}
                jumpToTimecode={setRequestedTimecode}
              />
            ) : modes[activeMode].isList ? (
              <ul>
                {timecodeList.map(({time, text}, i) => (
                  <li key={i} className="outputItem">
                    <button
                      onClick={() => setRequestedTimecode(timeToSecs(time))}
                    >
                      <time>{time}</time>
                      <p className="text">{text}</p>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              timecodeList.map(({time, text}, i) => (
                <>
                  <span
                    key={i}
                    className="sentence"
                    role="button"
                    onClick={() => setRequestedTimecode(timeToSecs(time))}
                  >
                    <time>{time}</time>
                    <span>{text}</span>
                  </span>{' '}
                </>
              ))
            )
          ) : null}
        </section>
      </div>
    </div>
    </Layout>
  )
}