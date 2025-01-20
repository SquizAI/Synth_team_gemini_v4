import {useState, useEffect} from 'react'
import c from 'classnames'

export default function Collaboration({videoFile}) {
  const [users, setUsers] = useState([
    {id: 1, name: 'You', color: '#36C5F0', active: true},
    {id: 2, name: 'AI Assistant', color: '#4A154B', active: true}
  ])
  const [annotations, setAnnotations] = useState([])
  const [showExport, setShowExport] = useState(false)

  const addAnnotation = (text, timestamp) => {
    setAnnotations(prev => [...prev, {
      id: Date.now(),
      text,
      timestamp,
      userId: 1,
      created: new Date().toISOString()
    }])
  }

  const exportAnalysis = format => {
    // Placeholder for export functionality
    console.log(`Exporting in ${format} format`)
    setShowExport(false)
  }

  return (
    <div className="collaborationPanel">
      <div className="collaborationHeader">
        <h2>Collaboration</h2>
        <div className="activeUsers">
          {users.map(user => (
            <div 
              key={user.id}
              className="userBadge"
              style={{'--user-color': user.color}}
            >
              <span className="userDot" />
              {user.name}
            </div>
          ))}
        </div>
      </div>

      <div className="annotationList">
        {annotations.map(note => (
          <div key={note.id} className="annotation">
            <div className="annotationMeta">
              <span className="timestamp">{note.timestamp}</span>
              <span className="author">
                {users.find(u => u.id === note.userId)?.name}
              </span>
            </div>
            <p>{note.text}</p>
          </div>
        ))}
      </div>

      <div className="collaborationTools">
        <button 
          className="exportButton"
          onClick={() => setShowExport(true)}
        >
          <span className="icon">download</span>
          Export Analysis
        </button>

        {showExport && (
          <div className="exportMenu">
            <button onClick={() => exportAnalysis('pdf')}>
              <span className="icon">description</span>
              Export as PDF
            </button>
            <button onClick={() => exportAnalysis('csv')}>
              <span className="icon">table_view</span>
              Export as CSV
            </button>
          </div>
        )}
      </div>
    </div>
  )
}