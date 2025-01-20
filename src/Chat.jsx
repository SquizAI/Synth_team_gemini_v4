import {useState, useRef, useEffect} from 'react'
import generateContent from './api'

export default function Chat({onClose, videoFile, isVideoLoaded}) {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({behavior: 'smooth'})
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async e => {
    e.preventDefault()
    if (!inputValue.trim() || !isVideoLoaded) return

    const userMessage = {
      type: 'user',
      content: inputValue
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const response = await generateContent({
        text: inputValue,
        file: videoFile
      })

      const aiMessage = {
        type: 'ai',
        content: response.text()
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      const errorMessage = {
        type: 'error',
        content: 'Sorry, I encountered an error. Please try again.'
      }
      setMessages(prev => [...prev, errorMessage])
    }

    setIsLoading(false)
  }

  return (
    <div className="chatPanel">
      <div className="chatHeader">
        <h2>
          <span className="icon">smart_toy</span>
          AI Chat Assistant
        </h2>
        <button onClick={onClose}>
          <span className="icon">close</span>
        </button>
      </div>

      <div className="capabilities">
        <h3>What I can help with</h3>
        <ul>
          <li>
            <span className="icon">description</span>
            Describe scenes & generate captions
          </li>
          <li>
            <span className="icon">analytics</span>
            Analyze content & provide insights
          </li>
          <li>
            <span className="icon">table_chart</span>
            Extract & visualize video data
          </li>
          <li>
            <span className="icon">format_quote</span>
            Transcribe speech & find quotes
          </li>
        </ul>
      </div>

      <div className="chatMessages">
        {messages.map((message, index) => (
          <div key={index} className={'message ' + message.type}>
            <span className="icon">
              {message.type === 'user' ? 'person' : 'smart_toy'}
            </span>
            <p>{message.content}</p>
          </div>
        ))}
        {isLoading && (
          <div className="message loading">
            <span className="icon">smart_toy</span>
            <p>Thinking<span>...</span></p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="chatInput">
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder={isVideoLoaded ? 'Ask me anything about the video...' : 'Upload a video to start chatting'}
          disabled={!isVideoLoaded}
        />
        <button type="submit" disabled={!isVideoLoaded || !inputValue.trim()}>
          <span className="icon">send</span>
        </button>
      </form>
    </div>
  )
}