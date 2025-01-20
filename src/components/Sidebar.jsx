import {useState} from 'react'
import c from 'classnames'

export default function Sidebar() {
  const [activeSection, setActiveSection] = useState('analysis')

  const sections = [
    {
      id: 'analysis',
      icon: 'analytics',
      label: 'Analysis',
      features: [
        {icon: 'description', label: 'Scene descriptions and captions'},
        {icon: 'insights', label: 'Video analysis and insights'},
        {icon: 'table_chart', label: 'Data extraction and visualization'},
        {icon: 'format_quote', label: 'Transcription and quotes'}
      ]
    },
    {
      id: 'processing',
      icon: 'psychology',
      label: 'Processing',
      features: [
        {icon: 'record_voice_over', label: 'Transcription & Speakers'},
        {icon: 'sentiment_satisfied', label: 'Emotion Detection'},
        {icon: 'bookmark', label: 'Auto Chapters'},
        {icon: 'search', label: 'Visual Search'}
      ]
    },
    {
      id: 'collaboration',
      icon: 'group',
      label: 'Collaboration',
      features: [
        {icon: 'edit', label: 'Annotations'},
        {icon: 'share', label: 'Share Analysis'},
        {icon: 'download', label: 'Export Results'}
      ]
    }
  ]

  return (
    <aside className="sidebar">
      <div className="sidebarHeader">
        <h1>📼 Video Applet</h1>
      </div>

      <nav className="sidebarNav">
        {sections.map(section => (
          <div key={section.id} className="sidebarSection">
            <button
              className={c('sectionButton', {active: activeSection === section.id})}
              onClick={() => setActiveSection(section.id)}
            >
              <span className="icon">{section.icon}</span>
              {section.label}
            </button>

            <div className={c('featureList', {active: activeSection === section.id})}>
              {section.features.map((feature, i) => (
                <button key={i} className="featureButton">
                  <span className="icon">{feature.icon}</span>
                  {feature.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}