import {useState, useEffect} from 'react'

export default function VideoLibrary() {
  const [videos, setVideos] = useState([])

  useEffect(() => {
    // Load videos from localStorage on mount
    const storedVideos = JSON.parse(localStorage.getItem('uploadedVideos') || '[]')
    setVideos(storedVideos)
  }, [])

  const formatDate = date => {
    return new Date(date).toLocaleString()
  }

  const formatFileSize = bytes => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Byte'
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)))
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i]
  }

  return (
    <div className="videoLibrary">
      <h2>Video Library</h2>
      {videos.length === 0 ? (
        <p className="emptyLibrary">No videos uploaded yet</p>
      ) : (
        <div className="videoGrid">
          {videos.map((video, index) => (
            <div key={index} className="videoCard">
              <div className="videoInfo">
                <h3>{video.fileName}</h3>
                <div className="metadata">
                  <span className="date">
                    <span className="icon">calendar_today</span>
                    {formatDate(video.uploadDate)}
                  </span>
                  <span className="size">
                    <span className="icon">folder</span>
                    {formatFileSize(video.fileSize)}
                  </span>
                  <span className={`status ${video.status.toLowerCase()}`}>
                    <span className="icon">
                      {video.status === 'ACTIVE' ? 'check_circle' : 'hourglass_empty'}
                    </span>
                    {video.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}