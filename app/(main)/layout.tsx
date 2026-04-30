import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ServerList from '@/components/sidebar/ServerList'
import UserPanel from '@/components/sidebar/UserPanel'
import StreamProvider from '@/components/providers/StreamProvider'
import ThemeProvider from '@/components/providers/ThemeProvider'
import NotificationProvider from '@/components/notifications/NotificationProvider'
import DMSidebar from '@/components/dm/DMSidebar'
import MobileLayout from '@/components/mobile/MobileLayout'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <ThemeProvider>
      <NotificationProvider>
        <StreamProvider>
          {/* Desktop */}
          <div className="hidden md:flex h-screen overflow-hidden">
            <ServerList />
            <DMSidebar />
            <main className="flex-1 flex flex-col overflow-hidden">
              {children}
            </main>
            <UserPanel />
          </div>

          {/* Mobile */}
          <div className="flex md:hidden h-screen overflow-hidden">
            <MobileLayout>
              {children}
            </MobileLayout>
          </div>
        </StreamProvider>
      </NotificationProvider>
    </ThemeProvider>
  )
}