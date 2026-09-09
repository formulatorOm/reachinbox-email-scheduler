import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

const providers: any[] = [
  CredentialsProvider({
    name: "Email & Password",
    credentials: {
      email: { label: "Email", type: "text" },
      password: { label: "Password", type: "password" }
    },
    async authorize(credentials) {
      const email = credentials?.email || "oliver.brown@domain.io";
      const nameParts = email.split('@')[0].split('.');
      const formattedName = nameParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
      
      return {
        id: "1",
        name: formattedName || "Oliver Brown",
        email: email,
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver",
      };
    }
  })
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.unshift(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

export const authOptions: any = {
  providers,
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async session({ session, token }: any) {
      if (session?.user) {
        session.user.id = token.sub || "1";
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET || "reachinbox_super_secret_string_123_fallback",
};