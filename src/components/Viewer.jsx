import { useEffect, useState } from 'react'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

export default function Viewer() {
  const [state, setState] = useState({ loading: true, error: '', html: '', remaining: 0 })

  useEffect(() => {
    const slug = window.location.pathname.split('/').pop()
    const load = async () => {
      try {
        const res = await fetch(`${BACKEND}/api/pages/${slug}`)
        if (!res.ok) throw new Error(res.status === 410 ? 'Expired' : 'Not found')
        const data = await res.json()
        setState({ loading: false, error: '', html: data.html, remaining: data.remaining_seconds })
      } catch (e) {
        setState({ loading: false, error: e.message, html: '', remaining: 0 })
      }
    }
    load()
  }, [])

  if (state.loading) return <div className="p-6">Loading…</div>
  if (state.error) return <div className="p-6">{state.error}</div>

  return (
    <div className="min-h-screen bg-white">
      <div dangerouslySetInnerHTML={{ __html: state.html }} />
    </div>
  )
}
