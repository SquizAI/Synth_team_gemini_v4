import {useState, useEffect} from 'react'
import c from 'classnames'

export default function FileSystem() {
  const [files, setFiles] = useState([])
  const [folders, setFolders] = useState([])
  const [currentPath, setCurrentPath] = useState('/')
  const [selectedItems, setSelectedItems] = useState([])
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  useEffect(() => {
    loadFileSystem()
  }, [])

  const loadFileSystem = () => {
    const storedFS = JSON.parse(localStorage.getItem('fileSystem') || '{}')
    const storedFiles = JSON.parse(localStorage.getItem('uploadedVideos') || '[]')
    
    setFiles(storedFiles.map(file => ({
      ...file,
      path: file.path || '/',
      type: 'file'
    })))
    
    setFolders(storedFS.folders || [{
      id: 'root',
      name: 'Root',
      path: '/',
      type: 'folder',
      created: new Date().toISOString()
    }])
  }

  const saveFileSystem = (newFiles, newFolders) => {
    localStorage.setItem('fileSystem', JSON.stringify({folders: newFolders}))
    localStorage.setItem('uploadedVideos', JSON.stringify(newFiles))
  }

  const getCurrentItems = () => {
    return [
      ...folders.filter(f => f.path === currentPath),
      ...files.filter(f => f.path === currentPath)
    ]
  }

  const getPathParts = () => {
    return currentPath.split('/').filter(Boolean)
  }

  const navigateToFolder = (path) => {
    setCurrentPath(path)
    setSelectedItems([])
  }

  const createFolder = () => {
    if (!newFolderName.trim()) return
    
    const newFolder = {
      id: Date.now().toString(),
      name: newFolderName,
      path: currentPath,
      type: 'folder',
      created: new Date().toISOString()
    }
    
    const updatedFolders = [...folders, newFolder]
    setFolders(updatedFolders)
    saveFileSystem(files, updatedFolders)
    setNewFolderName('')
    setIsCreatingFolder(false)
  }

  const moveItems = (items, targetPath) => {
    const updatedFiles = files.map(file => 
      items.includes(file.fileId) ? {...file, path: targetPath} : file
    )
    
    const updatedFolders = folders.map(folder =>
      items.includes(folder.id) ? {...folder, path: targetPath} : folder
    )

    setFiles(updatedFiles)
    setFolders(updatedFolders)
    saveFileSystem(updatedFiles, updatedFolders)
    setSelectedItems([])
  }

  const deleteItems = (items) => {
    const updatedFiles = files.filter(file => !items.includes(file.fileId))
    const updatedFolders = folders.filter(folder => !items.includes(folder.id))
    
    setFiles(updatedFiles)
    setFolders(updatedFolders)
    saveFileSystem(updatedFiles, updatedFolders)
    setSelectedItems([])
  }

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
    <div className="fileSystem">
      <div className="fileSystemHeader">
        <div className="headerContent" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
          <h2>Video Library</h2>
          
          <div className="fileSystemActions">
            <button 
              className="button"
              onClick={() => setIsCreatingFolder(true)}
              disabled={isCreatingFolder}
              title="Create new folder"
            >
              <span className="icon">create_new_folder</span>
            </button>
          
            {selectedItems.length > 0 && (
              <button 
                className="button delete"
                onClick={() => deleteItems(selectedItems)}
                title="Delete selected items"
              >
                <span className="icon">delete</span>
              </button>
            )}
          </div>
        </div>
        
        <div className="breadcrumb">
          <button onClick={() => navigateToFolder('/')}>
            <span className="icon">home</span>
          </button>
          {getPathParts().map((part, i) => (
            <div key={i} className="breadcrumbItem">
              <span className="icon">chevron_right</span>
              <button 
                onClick={() => 
                  navigateToFolder('/' + getPathParts().slice(0, i + 1).join('/'))
                }
              >
                {part}
              </button>
            </div>
          ))}
        </div>
      </div>

      {isCreatingFolder && (
        <div className="newFolderInput">
          <input
            type="text"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            placeholder="Folder name"
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter') createFolder()
              if (e.key === 'Escape') setIsCreatingFolder(false)
            }}
          />
          <div className="newFolderActions">
            <button onClick={createFolder}>Create</button>
            <button onClick={() => setIsCreatingFolder(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="fileList">
        {getCurrentItems().map((item) => (
          <div 
            key={item.id || item.fileId}
            className={c('fileItem', {
              selected: selectedItems.includes(item.id || item.fileId)
            })}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey) {
                setSelectedItems(prev => 
                  prev.includes(item.id || item.fileId)
                    ? prev.filter(id => id !== (item.id || item.fileId))
                    : [...prev, item.id || item.fileId]
                )
              } else if (item.type === 'folder') {
                navigateToFolder(currentPath + item.name + '/')
              }
            }}
          >
            <span className="icon">
              {item.type === 'folder' ? 'folder' : 'movie'}
            </span>
            <div className="fileDetails">
              <span className="fileName">{item.name || item.fileName}</span>
              <span className="fileInfo">
                {item.type === 'file' ? (
                  <>
                    {formatFileSize(item.fileSize)} • {formatDate(item.uploadDate)}
                    <span className={`status ${item.status.toLowerCase()}`}>
                      {item.status}
                    </span>
                  </>
                ) : (
                  formatDate(item.created)
                )}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}