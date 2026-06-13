export const metadata = {
  title: "Product Listing Form",
  description: "Create product listings with Supabase",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Arial, Helvetica, sans-serif" }}>{children}</body>
    </html>
  )
}