import "./globals.css";
import { Inter } from "next/font/google";
import "katex/dist/katex.min.css"; // Import KaTeX styles
import { Metadata, Viewport } from "next";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://bot.yuhuanstudio.com'),
  title: {
    default: "Guizhong - AI Chat Log",
    template: "%s | Guizhong"
  },
  description: "View and share your AI conversation history with Guizhong. Supports multiple AI models and rich text formatting.",
  keywords: ["AI", "Chat Log", "Guizhong", "LLM", "Conversation History"],
  authors: [{ name: "Guizhong Team" }],
  manifest: '/manifest.json',
  openGraph: {
    title: "Guizhong - AI Chat Log",
    description: "View and share your AI conversation history with Guizhong.",
    type: "website",
    locale: "zh_TW",
    siteName: "Guizhong",
  },
  twitter: {
    card: "summary_large_image",
    title: "Guizhong - AI Chat Log",
    description: "View and share your AI conversation history with Guizhong.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW" className="dark">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
