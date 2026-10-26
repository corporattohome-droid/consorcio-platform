import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: { email: { label: 'E-mail', type: 'email' }, password: { label: 'Senha', type: 'password' } },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null
        try {
          const res = await fetch(`${process.env.NEXTAUTH_API_URL ?? 'http://localhost:3001'}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: credentials.email, password: credentials.password }),
          })
          if (!res.ok) return null
          const json = await res.json()
          const data = json.data ?? json
          if (!data.accessToken) return null
          const profile = await fetch(`${process.env.NEXTAUTH_API_URL ?? 'http://localhost:3001'}/api/v1/auth/me`, {
            headers: { Authorization: `Bearer ${data.accessToken}` },
          })
          const profileJson = await profile.json()
          const user = profileJson.data ?? profileJson
          if (user.role !== 'CLIENT') return null
          return { id: user.id, email: user.email, name: user.customer?.fullName ?? user.email, role: user.role, accessToken: data.accessToken, customerId: user.customerId }
        } catch { return null }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.role = (user as any).role; token.accessToken = (user as any).accessToken; token.customerId = (user as any).customerId }
      return token
    },
    async session({ session, token }) {
      if (session.user) { (session.user as any).role = token.role; (session.user as any).accessToken = token.accessToken; (session.user as any).customerId = token.customerId }
      return session
    },
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt', maxAge: 60 * 60 * 8 },
})

export { handler as GET, handler as POST }
