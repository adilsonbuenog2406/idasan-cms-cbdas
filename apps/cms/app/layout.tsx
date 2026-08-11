import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CBDAS CMS",
  description: "Painel de gestao do site III CBDAS",
  icons: {
    icon: [{ url: "/icon.webp", type: "image/webp" }],
    shortcut: "/icon.webp",
    apple: "/icon.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
