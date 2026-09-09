import { withAuth } from "next-auth/middleware";

export default withAuth({
  secret: process.env.NEXTAUTH_SECRET || "reachinbox_super_secret_jwt_key_9999",
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: ["/", "/sent", "/compose"],
};