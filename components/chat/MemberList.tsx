'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import StatusIndicator from '@/components/ui/StatusIndicator'
import Image from 'next/image'

type Member = {
  role: string
  profiles: {
    id: string
    username: string
    avatar_url: string | null
    status: string
    nickname_color: string | null
  }
}

const ROLE_ORDER = { owner: 0, admin: 1, member: 2 }
const ROLE_LABEL = { owner: 'Propietario', admin: 'Admin', member: 'Miembros' }

export default function MemberList({ serverId }: { serverId: string }) {
  const supabase = createClient()
  const [members, setMembers] = useState<Member[]>([])

  useEffect(() => {
    if (!serverId) return
    fetchMembers()

    // Realtime cuando alguien entra o sale
    const channel = supabase
      .channel(`members:${serverId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'members', filter: `server_id=eq.${serverId}` },
        () => fetchMembers()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [serverId])

  const fetchMembers = async () => {
    const { data } = await supabase
      .from('members')
      .select(`
        role,
        profiles (
          id,
          username,
          avatar_url,
          status,
          nickname_color
        )
      `)
      .eq('server_id', serverId)
      .order('role')

    if (data) setMembers(data as unknown as Member[])
  }

  // Agrupar por rol
  const grouped = members.reduce((acc, member) => {
    const role = member.role as keyof typeof ROLE_LABEL
    if (!acc[role]) acc[role] = []
    acc[role].push(member)
    return acc
  }, {} as Record<string, Member[]>)

  const roleOrder = ['owner', 'admin', 'member'] as const

  return (
    <aside className="w-60 bg-gray-800 border-l border-gray-900 flex flex-col shrink-0 overflow-y-auto">
      <div className="h-12 px-4 flex items-center border-b border-gray-900">
        <span className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
          Miembros — {members.length}
        </span>
      </div>

      <div className="flex flex-col py-3 gap-4">
        {roleOrder.map((role) => {
          const group = grouped[role]
          if (!group?.length) return null

          return (
            <div key={role}>
              <p className="px-4 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {ROLE_LABEL[role]} — {group.length}
              </p>
              <div className="flex flex-col gap-0.5 px-2">
                {group.map((member) => (
                  <div
                    key={member.profiles.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-700 transition-colors cursor-pointer"
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-8 h-8 rounded-full overflow-hidden">
                        {member.profiles.avatar_url ? (
                          <Image
                            src={member.profiles.avatar_url}
                            alt={member.profiles.username}
                            width={32}
                            height={32}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                            {member.profiles.username.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      {/* Indicador de estado */}
                      <div className="absolute -bottom-0.5 -right-0.5 border-2 border-gray-800 rounded-full">
                        <StatusIndicator
                          userId={member.profiles.id}
                          initialStatus={member.profiles.status as any}
                          size="sm"
                        />
                      </div>
                    </div>

                    {/* Nombre */}
                    <span
                      className="text-sm truncate"
                      style={{ color: member.profiles.nickname_color ?? '#9ca3af' }}
                    >
                      {member.profiles.username}
                    </span>

                    {/* Badge de rol */}
                    {role === 'owner' && (
                      <span className="ml-auto text-yellow-400 text-xs">👑</span>
                    )}
                    {role === 'admin' && (
                      <span className="ml-auto text-indigo-400 text-xs">⚡</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}