import NextAuth from "next-auth";
import { authOptions } from "../../../lib/auth";

if (!process.env.NEXTAUTH_SECRET) {
  process.env.NEXTAUTH_SECRET = "reachinbox_super_secret_string_123_fallback";
}

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };