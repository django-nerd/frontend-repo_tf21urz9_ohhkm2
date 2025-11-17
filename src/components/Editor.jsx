import { useEffect, useRef, useState } from 'react'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

function getCaretEndInsertion(container) {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return null
  const range = sel.getRangeAt(0)
  range.collapse(false)
  return range
}

async function uploadFile(file) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BACKEND}/api/upload`, { method: 'POST', body: form })
  if (!res.ok) throw new Error('Upload failed')
  const data = await res.json()
  return data.url
}

async function proxyImage(url) {
  const res = await fetch(`${BACKEND}/api/proxy-image?url=` + encodeURIComponent(url))
  if (!res.ok) throw new Error('Proxy failed')
  const data = await res.json()
  return data.url
}

function htmlToElement(html) {
  const template = document.createElement('template')
  template.innerHTML = html.trim()
  return template.content
}

export default function Editor({ onCreate }) {
  const ref = useRef(null)
  const [busy, setBusy] = useState(false)
  const [assets, setAssets] = useState([])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const handlePaste = async (e) => {
      e.preventDefault()
      setBusy(true)
      try {
        const html = e.clipboardData.getData('text/html')
        const text = e.clipboardData.getData('text/plain')
        let fragment

        if (html) {
          const parser = new DOMParser()
          const doc = parser.parseFromString(html, 'text/html')

          // Replace images: data: URIs, blob:, http(s)
          const imgEls = Array.from(doc.querySelectorAll('img'))
          for (const img of imgEls) {
            const src = img.getAttribute('src') || ''
            try {
              if (src.startsWith('data:')) {
                const blob = await (await fetch(src)).blob()
                const file = new File([blob], 'pasted.png', { type: blob.type || 'image/png' })
                const url = await uploadFile(file)
                img.setAttribute('src', url)
                setAssets((prev) => [...prev, url])
              } else if (src.startsWith('blob:')) {
                // blob URLs are not directly accessible; try to get from items below, or skip
              } else if (/^https?:\/\//i.test(src)) {
                const proxied = await proxyImage(src)
                img.setAttribute('src', proxied)
                setAssets((prev) => [...prev, proxied])
              }
            } catch (err) {
              // If proxy/upload fails, keep original src
            }
          }

          fragment = doc.body
        } else if (text) {
          const safe = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>')
          fragment = htmlToElement(`<div>${safe}</div> `)
        }

        // Also handle image files present in clipboard items
        const items = e.clipboardData.items || []
        const images = []
        for (const it of items) {
          if (it.kind === 'file' && it.type.startsWith('image/')) {
            const file = it.getAsFile()
            if (file) images.push(file)
          }
        }
        for (const file of images) {
          try {
            const url = await uploadFile(file)
            const imgNode = document.createElement('img')
            imgNode.src = url
            imgNode.style.maxWidth = '100%'
            if (fragment) fragment.appendChild(imgNode)
            else fragment = htmlToElement(`<img src="${url}" />`)
            setAssets((prev) => [...prev, url])
          } catch {}
        }

        if (fragment) {
          const range = getCaretEndInsertion(el)
          if (range) {
            const contents = document.createDocumentFragment()
            while (fragment.firstChild) contents.appendChild(fragment.firstChild)
            range.insertNode(contents)
          } else {
            el.appendChild(fragment)
          }
        }
      } finally {
        setBusy(false)
      }
    }

    el.addEventListener('paste', handlePaste)
    return () => el.removeEventListener('paste', handlePaste)
  }, [])

  const handleCreate = async () => {
    const html = ref.current?.innerHTML || ''
    if (!html.trim()) return
    setBusy(true)
    try {
      const res = await fetch(`${BACKEND}/api/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, ttl_seconds: 600, assets })
      })
      if (!res.ok) throw new Error('Failed to create page')
      const data = await res.json()
      // Use backend base so the link works even without the React app
      const full = `${BACKEND}${data.url}`
      onCreate(full)
    } catch (e) {
      alert('Could not create page. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm text-gray-600">Paste content here (Cmd/Ctrl+V). Formatting and images will be preserved.</div>
        <button onClick={handleCreate} disabled={busy} className="px-4 py-2 rounded bg-black text-white disabled:opacity-60">Create temporary page</button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className="min-h-[50vh] w-full bg-white rounded border border-gray-200 focus:outline-none p-4 prose max-w-none"
        style={{whiteSpace:'pre-wrap'}}
        placeholder="Paste here"
      />
    </div>
  )
}
