import { Geist, Geist_Mono } from "next/font/google"

import "./globals.css"
import { SiteHeader } from "@/components/site-header"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

const fontSans = Geist({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        fontSans.variable
      )}
    >
      <head>
        {/*
          The workerd bundle is built by esbuild with `keepNames: true`, which
          rewrites function bodies to call `__name(...)`. next-themes inlines
          its no-flash script via `fn.toString()`, so those calls end up in the
          HTML and throw `__name is not defined` in the browser — which breaks
          the pre-hydration theme. Define a no-op before that script runs.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: "window.__name = window.__name || ((fn) => fn)",
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <div className="flex h-svh flex-col">
            <SiteHeader />
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
