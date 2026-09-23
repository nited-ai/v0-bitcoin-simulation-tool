import localFont from "next/font/local"

export const fontSans = localFont({
  src: '../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2',
  weight: '100 900',
  display: 'swap',
  variable: "--font-sans",
})
