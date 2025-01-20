import {useState} from 'react'
import c from 'classnames'

export default function AdvancedProcessing({videoFile}) {
  const [activeTab, setActiveTab] = useState('transcription')
  const [searchQuery, setSearchQuery] = useState('')
  const [processing, setProcessing] = useState(false)

  const tabs = {
    transcription: {
      icon: 'record_voice_over',
      title: 'Transcription & Speakers'
    },
    emotions: {
      icon: 'sentiment_satisfied',
      title: 'Emotion Detection'
    },
    chapters: {
      icon: 'bookmark',
      title: 'Auto Chapters'
    },
    search: {
      icon: 'search',
      title: 'Visual Search'
    }
  }

  const startProcessing = type => {
    setProcessing(true)
    // Placeholder for processing logic
    setTimeout(() => setProcessing(false), 2000)
  }

  return (
    <div className="processingPanel">
      <div className="processingTabs">
        {Object.entries(tabs).map(([key, {icon, title}]) => (
          <button
            key={key}
            className={c('tabButton', {active: activeTab === key})}
            onClick={() => setActiveTab(key)}
          >
            <span className="icon">{icon}</span>
            {title}
          </button>
        ))}
      </div>

      <div className="processingContent">
        {activeTab === 'search' ? (
          <div className="visualSearch">
            <input
              type="text"
              placeholder="Search for objects in video..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <button 
              className="searchButton"
              onClick={() => startProcessing('search')}
              disabled={!searchQuery.trim() || processing}
            >
              <span className="icon">search</span>
              Search
            </button>
          </div>
        ) : (
          <button
            className="processButton"
            onClick={() => startProcessing(activeTab)}
            disabled={processing}
          >
            <span className="icon">
              {processing ? 'hourglass_empty' : 'play_arrow'}
            </span>
            {processing ? 'Processing...' : `Start ${tabs[activeTab].title}`}
          </button>
        )}
      </div>
    </div>
  )
}