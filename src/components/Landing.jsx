import { useState } from 'react'
import Editor from './Editor'

export default function Landing() {
  const [shareUrl, setShareUrl] = useState('')

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <header className="px-6 py-5">
        <h1 className="text-2xl font-semibold">Temporary Content Share</h1>
        <p className="text-sm text-gray-500">Paste anything. Create a 10‑minute link.</p>
      </header>
      <main>
        <Editor onCreate={setShareUrl} />
        {shareUrl && (
          <div className="max-w-4xl mx-auto px-4 pb-8">
            <div className="flex items-center gap-3 bg-white border rounded p-3">
              <input readOnly value={shareUrl} className="flex-1 bg-transparent outline-none" />
              <button onClick={() => { navigator.clipboard.writeText(shareUrl) }} className="px-3 py-2 rounded bg-black text-white">Copy</button>
              <a href={shareUrl} target="_blank" rel="noreferrer" className="px-3 py-2 rounded bg-gray-800 text-white">Open</a>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
