import { useState, useEffect } from 'react'

import './Popup.css'
import {Filters} from "../components/filters/Filters";

export const Popup = () => {
  const [count, setCount] = useState(0)

  const minus = () => {
    if (count > 0) setCount(count - 1)
  }

  const add = () => setCount(count + 1)

  useEffect(() => {
    chrome.storage.sync.get(['count'], (result) => {
      setCount(result.count || 0)
    })
  }, [])

  useEffect(() => {
    chrome.storage.sync.set({ count })
    chrome.runtime.sendMessage({ type: 'COUNT', count })
  }, [count])

  return (
    <main>
      <h3>Popup Page</h3>
      <Filters/>
      <div className="calc">
        <button onClick={minus} disabled={count <= 0}>
          -
        </button>
        <label>{count}</label>
        <button onClick={add}>+</button>
      </div>
    </main>
  )
}

export default Popup
