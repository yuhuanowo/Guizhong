import { Metadata } from "next"
import LoginView from "./LoginView"

export const metadata: Metadata = {
  title: "Login",
}

interface LoginPageProps {
  searchParams: Promise<{
    callbackUrl?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { callbackUrl } = await searchParams;
  return <LoginView callbackUrl={callbackUrl} />
}
