import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Classroom AI — Learn Anything, Deeply",
  description:
    "An AI-powered interactive learning experience with a dynamic knowledge mindmap",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full overflow-hidden bg-bg text-text-primary">
        {children}
      </body>
    </html>
  );
}
