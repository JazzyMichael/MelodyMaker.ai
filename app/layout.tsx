import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "MelodyMaker.ai",
  description: "Create music based on spotify tracks and custom details.",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
