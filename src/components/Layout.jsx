import {useState} from 'react'
import c from 'classnames'
import Sidebar from './Sidebar'

export default function Layout({children}) {
  const [theme] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  )

  return (
    <div className={c('layout', theme)}>
      <Sidebar />
      <main className="mainContent">
        {children}
      </main>
    </div>
  )
}