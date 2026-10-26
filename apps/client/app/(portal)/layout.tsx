import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { TopBar } from '@/components/layout/top-bar'
import { BottomNav } from '@/components/layout/bottom-nav'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopBar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-5 pb-24 md:pb-8">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
