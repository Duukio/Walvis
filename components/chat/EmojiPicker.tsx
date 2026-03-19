'use client'

import { useState, useMemo } from 'react'

const CATEGORIES = [
  { id: 'recent', label: '🕐', name: 'Recientes' },
  { id: 'smileys', label: '😀', name: 'Emociones' },
  { id: 'people', label: '👋', name: 'Personas' },
  { id: 'animals', label: '🐶', name: 'Animales' },
  { id: 'food', label: '🍕', name: 'Comida' },
  { id: 'travel', label: '✈️', name: 'Viajes' },
  { id: 'objects', label: '💡', name: 'Objetos' },
  { id: 'symbols', label: '❤️', name: 'Símbolos' },
  {id: 'flags', label: '🏳️', name: 'Banderas' },
]

const EMOJIS: Record<string, string[]> = {
  smileys: [
    '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩',
    '😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐',
    '🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒',
    '🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕',
    '😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱',
    '😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩',
  ],
  people: [
    '👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆',
    '🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️',
    '💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🫀','🫁','🧠','🦷','🦴','👀',
    '👁️','👅','👄','👶','🧒','👦','👧','🧑','👱','👨','🧔','👩','🧓','👴','👵','🙍',
  ],
  animals: [
    '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐸','🐵',
    '🙈','🙉','🙊','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝',
    '🪱','🐛','🦋','🐌','🐞','🐜','🪲','🦟','🦗','🪳','🕷️','🦂','🐢','🐍','🦎','🦖',
    '🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆',
  ],
  food: [
    '🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝',
    '🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🧄','🧅','🥔','🍠','🥐','🥯','🍞','🥖',
    '🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🫓',
    '🌮','🌯','🫔','🥙','🧆','🥚','🍜','🍝','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚',
    '🍘','🍥','🥮','🍢','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜',
    '🍯','🧃','🥤','🧋','☕','🍵','🫖','🍶','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉',
  ],
  travel: [
    '🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🏍️','🛵',
    '🛺','🚲','🛴','🛹','🛼','🚏','🛣️','🛤️','⛽','🚨','🚥','🚦','🛑','🚧','⚓','🛟',
    '⛵','🚤','🛥️','🛳️','⛴️','🚢','✈️','🛩️','🛫','🛬','🪂','💺','🚁','🚟','🚠','🚡',
    '🛰️','🚀','🛸','🏖️','🏕️','🏗️','🏘️','🏚️','🏠','🏡','🏢','🏣','🏤','🏥','🏦','🏨',
  ],
  objects: [
    '⌚','📱','📲','💻','⌨️','🖥️','🖨️','🖱️','🖲️','💽','💾','💿','📀','📷','📸','📹',
    '🎥','📽️','🎞️','📞','☎️','📟','📠','📺','📻','🧭','⏱️','⏲️','⏰','🕰️','⌛','⏳',
    '📡','🔋','🪫','🔌','💡','🔦','🕯️','🪔','🧯','🛢️','💰','💴','💵','💶','💷','💸',
    '💳','🪙','💹','📈','📉','📊','📋','📌','📍','✂️','🗃️','🗄️','🗑️','🔒','🔓','🔏',
  ],
  symbols: [
    '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖',
    '💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈',
    '♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','🉑','☢️','☣️',
    '📴','📳','🈶','🈚','🈸','🈺','🈷️','✴️','🆚','💮','🉐','㊙️','㊗️','🈴','🈵','🈹',
    '🅰️','🅱️','🆎','🆑','🅾️','🆘','❌','⭕','🛑','⛔','📛','🚫','💯','💢','♨️','🚷',
    '✅','☑️','✔️','❎','🔰','♻️','⚜️','🔱','📛','🔰','⭕','✅','❎','🔄','🔃','➡️',
  ],

flags: [
  '🏳️','🏴','🏁','🚩','🏳️‍🌈','🏳️‍⚧️',
  '🇦🇷','🇧🇷','🇨🇱','🇺🇾','🇵🇾','🇧🇴','🇵🇪','🇨🇴','🇻🇪','🇪🇨',
  '🇲🇽','🇺🇸','🇨🇦',
  '🇪🇸','🇫🇷','🇮🇹','🇩🇪','🇬🇧','🇵🇹','🇳🇱','🇧🇪','🇨🇭','🇦🇹',
  '🇸🇪','🇳🇴','🇩🇰','🇫🇮','🇵🇱','🇨🇿','🇬🇷','🇮🇪',
  '🇯🇵','🇨🇳','🇰🇷','🇮🇳','🇹🇭','🇻🇳','🇮🇩','🇵🇭','🇸🇬',
  '🇸🇦','🇦🇪','🇮🇱','🇹🇷','🇮🇷',
  '🇿🇦','🇪🇬','🇳🇬','🇲🇦','🇰🇪',
  '🇦🇺','🇳🇿',
]

}

const RECENT_KEY = 'walvis_recent_emojis'

function getRecent(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
  } catch {
    return []
  }
}

function addRecent(emoji: string) {
  const recent = getRecent().filter(e => e !== emoji)
  recent.unshift(emoji)
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 24)))
}

export default function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [activeCategory, setActiveCategory] = useState('smileys')
  const [search, setSearch] = useState('')
  const [recent, setRecent] = useState<string[]>(getRecent)

  const handleSelect = (emoji: string) => {
    addRecent(emoji)
    setRecent(getRecent())
    onSelect(emoji)
  }

  const displayEmojis = useMemo(() => {
    if (search.trim()) {
      const all = Object.values(EMOJIS).flat()
      return all.filter(e => e.includes(search))
    }
    if (activeCategory === 'recent') return recent
    return EMOJIS[activeCategory] ?? []
  }, [activeCategory, search, recent])

  return (
    <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 w-72 overflow-hidden flex flex-col">
      {/* Búsqueda */}
      <div className="p-2 border-b border-gray-700">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar emoji..."
          className="w-full bg-gray-900 text-white text-sm px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
          autoFocus
        />
      </div>

      {/* Categorías */}
      {!search && (
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-700 overflow-x-auto scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              title={cat.name}
              className={`text-lg px-1.5 py-1 rounded-lg transition-colors shrink-0 ${
                activeCategory === cat.id
                  ? 'bg-indigo-600'
                  : 'hover:bg-gray-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Nombre de categoría */}
      {!search && (
        <p className="px-3 pt-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {CATEGORIES.find(c => c.id === activeCategory)?.name}
        </p>
      )}

      {/* Grid de emojis */}
      <div className="grid grid-cols-8 gap-0.5 p-2 h-48 overflow-y-auto">
        {displayEmojis.length === 0 ? (
          <div className="col-span-8 flex items-center justify-center text-gray-500 text-sm h-full">
            {activeCategory === 'recent' ? 'Sin emojis recientes' : 'Sin resultados'}
          </div>
        ) : (
          displayEmojis.map((emoji, i) => (
            <button
              key={`${emoji}-${i}`}
              onClick={() => handleSelect(emoji)}
              className="text-xl w-8 h-8 flex items-center justify-center rounded hover:bg-gray-700 transition-colors"
              title={emoji}
            >
              {emoji}
            </button>
          ))
        )}
      </div>
    </div>
  )
}