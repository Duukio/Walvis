'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Smile, Paperclip, SendHorizonal, X } from 'lucide-react'
import { GiphyFetch } from '@giphy/js-fetch-api'
import { Grid } from '@giphy/react-components'
import EmojiPicker from '@/components/chat/EmojiPicker'

const gf = new GiphyFetch(process.env.NEXT_PUBLIC_GIPHY_API_KEY!)

type Attachment = {
  type: 'image' | 'file' | 'gif'
  url: string
  name: string
  size?: number
}

export default function MessageInput({ channelId }: { channelId: string }) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [showEmoji, setShowEmoji] = useState(false)
  const [showGiphy, setShowGiphy] = useState(false)
  const [giphySearch, setGiphySearch] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('#emoji-panel') && !target.closest('#emoji-btn')) {
        setShowEmoji(false)
      }
      if (!target.closest('#giphy-panel') && !target.closest('#giphy-btn')) {
        setShowGiphy(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

const handleSend = async () => {
  const trimmed = content.trim()
  if ((!trimmed && attachments.length === 0) || sending) return

  setSending(true)

  await fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channel_id: channelId,
      content: trimmed || '',
      attachments: attachments.length > 0 ? attachments : null,
    }),
  })

  setContent('')
  setAttachments([])
  setSending(false)
}

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploading(false); return }

    const uploaded: Attachment[] = []

    for (const file of files) {
      const path = `${user.id}/${Date.now()}-${file.name}`
      const { error } = await supabase.storage
        .from('attachments')
        .upload(path, file, { upsert: false })

      if (!error) {
        const { data: { publicUrl } } = supabase.storage
          .from('attachments')
          .getPublicUrl(path)

        uploaded.push({
          type: file.type.startsWith('image/') ? 'image' : 'file',
          url: publicUrl,
          name: file.name,
          size: file.size,
        })
      }
    }

    setAttachments(prev => [...prev, ...uploaded])
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleGifSelect = (gif: any) => {
    setAttachments(prev => [...prev, {
      type: 'gif',
      url: gif.images.fixed_height.url,
      name: gif.title,
    }])
    setShowGiphy(false)
    setGiphySearch('')
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const fetchGifs = (offset: number) =>
    giphySearch
      ? gf.search(giphySearch, { offset, limit: 10 })
      : gf.trending({ offset, limit: 10 })

  return (
    <div className="px-4 pb-4 pt-2 relative">

      {/* Panel de emojis */}
      {showEmoji && (
        <div id="emoji-panel" className="absolute bottom-full mb-2 left-4 z-50">
          <EmojiPicker onSelect={(emoji) => {
            setContent(prev => prev + emoji)
            setShowEmoji(false)
          }} />
        </div>
      )}

      {/* Panel de GIFs */}
      {showGiphy && (
        <div id="giphy-panel" className="absolute bottom-full mb-2 left-4 z-50 bg-gray-800 rounded-xl shadow-xl border border-gray-700 w-80 overflow-hidden">
          <div className="p-2 border-b border-gray-700">
            <input
              type="text"
              value={giphySearch}
              onChange={(e) => setGiphySearch(e.target.value)}
              placeholder="Buscar GIFs..."
              className="w-full bg-gray-900 text-white text-sm px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              autoFocus
            />
          </div>
          <div className="h-64 overflow-y-auto p-2">
            <Grid
              key={giphySearch}
              fetchGifs={fetchGifs}
              width={288}
              columns={2}
              gutter={4}
              onGifClick={(gif, e) => {
                e.preventDefault()
                handleGifSelect(gif)
              }}
            />
          </div>
          <div className="px-3 pb-2 text-right">
            <span className="text-xs text-gray-500">Powered by GIPHY</span>
          </div>
        </div>
      )}

      {/* Preview de adjuntos */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((att, i) => (
            <div key={i} className="relative group">
              {att.type === 'image' || att.type === 'gif' ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={att.url} alt={att.name} className="h-20 w-auto rounded object-cover" />
                  <button
                    onClick={() => removeAttachment(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={10} className="text-white" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-gray-600 rounded px-3 py-2 text-sm text-gray-200">
                  <Paperclip size={14} />
                  <span className="max-w-[120px] truncate">{att.name}</span>
                  <button onClick={() => removeAttachment(i)}>
                    <X size={12} className="text-gray-400 hover:text-white" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input principal */}
      <div className="flex items-center gap-2 bg-gray-600 rounded-lg px-3 py-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="text-gray-400 hover:text-white transition-colors shrink-0"
          title="Adjuntar archivo"
        >
          {uploading
            ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            : <Paperclip size={18} />
          }
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip"
          onChange={handleFileChange}
          className="hidden"
        />

        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un mensaje..."
          className="flex-1 bg-transparent text-gray-200 placeholder-gray-400 text-sm focus:outline-none"
          disabled={sending}
        />

        <button
          id="giphy-btn"
          onClick={() => { setShowGiphy(!showGiphy); setShowEmoji(false) }}
          className={`transition-colors shrink-0 text-xs font-bold px-1.5 py-0.5 rounded ${
            showGiphy ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
          title="GIF"
        >
          GIF
        </button>

        <button
          id="emoji-btn"
          onClick={() => { setShowEmoji(!showEmoji); setShowGiphy(false) }}
          className={`transition-colors shrink-0 ${
            showEmoji ? 'text-indigo-400' : 'text-gray-400 hover:text-white'
          }`}
          title="Emojis"
        >
          <Smile size={18} />
        </button>

        <button
          onClick={handleSend}
          disabled={(!content.trim() && attachments.length === 0) || sending}
          className="text-gray-400 hover:text-indigo-400 disabled:opacity-30 transition-colors shrink-0"
          title="Enviar"
        >
          <SendHorizonal size={18} />
        </button>
      </div>

      <p className="text-xs text-gray-500 mt-1 px-1">
        Enter para enviar · Shift+Enter para nueva línea
      </p>
    </div>
  )
}