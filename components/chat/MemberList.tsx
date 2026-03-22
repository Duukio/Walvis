'use client'

import { useState,useEffect,useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import StatusIndicator from '@/components/ui/StatusIndicator'
import Image from 'next/image'
import UserProfilePopup from '@/components/ui/UserProfilePopup'

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

const ROLE_LABEL = { owner: 'Propietario', admin: 'Admin', member: 'Miembros' }

export default function MemberList({ serverId }: { serverId: string }) {
  const supabase = createClient()
  const [members, setMembers] = useState<Member[]>([])
  const [serverRoles, setServerRoles] = useState<{ id: string; name: string; color: string }[]>([])
  const [memberRolesMap, setMemberRolesMap] = useState<Record<string, string[]>>({})

  useEffect(() => {
    if (!serverId) return
    fetchMembers()

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

    const { data: rolesData } = await supabase
      .from('roles')
      .select('id, name, color')
      .eq('server_id', serverId)
      .order('position', { ascending: false })

      
    if (rolesData) setServerRoles(rolesData)

    const { data: memberRolesData } = await supabase
      .from('member_roles')
      .select('user_id, role_id')
      .eq('server_id', serverId)


    if (memberRolesData) {
      const map: Record<string, string[]> = {}
      for (const mr of memberRolesData) {
        if (!map[mr.user_id]) map[mr.user_id] = []
        map[mr.user_id].push(mr.role_id)
      }
      setMemberRolesMap(map)
    }
  }

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
            {group.map((member) => {
  const MemberItem = () => {
    const [showProfile, setShowProfile] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    return (
      <div
        key={member.profiles.id}
        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-700 transition-colors cursor-pointer"
        ref={ref}
        onClick={() => setShowProfile(true)}
      >
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-8 h-8 rounded-full overflow-hidden">
            {member.profiles.avatar_url ? (
              <Image src={member.profiles.avatar_url} alt={member.profiles.username} width={32} height={32} className="object-cover w-full h-full" />
            ) : (
              <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                {member.profiles.username.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 border-2 border-gray-800 rounded-full">
            <StatusIndicator userId={member.profiles.id} initialStatus={member.profiles.status as any} size="sm" />
          </div>
        </div>

        {/* Nombre y roles */}
        <div className="flex-1 min-w-0">
          <p className="text-sm truncate" style={{ color: member.profiles.nickname_color ?? '#9ca3af' }}>
            {member.profiles.username}
          </p>
          {memberRolesMap[member.profiles.id]?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {memberRolesMap[member.profiles.id].map((roleId) => {
                const r = serverRoles.find(sr => sr.id === roleId)
                if (!r) return null
                return (
                  <span key={roleId} className="text-xs px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: r.color }}>
                    {r.name}
                  </span>
                )
              })}
            </div>
          )}
        </div>

        {/* Badge de rol básico */}
        {role === 'owner' && <span className="ml-auto text-xs px-1.5 py-0.5 rounded font-semibold shrink-0" style={{ backgroundColor: '#f59e0b20', color: '#f59e0b' }}>OWNER</span>}
        {role === 'admin' && <span className="ml-auto text-xs px-1.5 py-0.5 rounded font-semibold shrink-0" style={{ backgroundColor: '#6366f120', color: '#6366f1' }}>ADMIN</span>}

        {/* Popup */}
        {showProfile && (
          <UserProfilePopup
            userId={member.profiles.id}
            serverId={serverId}
            onClose={() => setShowProfile(false)}
            anchorRef={ref as React.RefObject<HTMLElement>}
          />
        )}
      </div>
    )
  }

  return <MemberItem key={member.profiles.id} />
})}
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}