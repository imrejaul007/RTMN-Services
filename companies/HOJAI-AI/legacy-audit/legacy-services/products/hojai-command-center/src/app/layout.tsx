import type { Metadata } from "next";
import { QueryProvider } from "./providers";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "HOJAI AI Command Center",
  description: "Executive Command Center - Unified view of your entire business with natural language queries",
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎯</text></svg>",
        type: "image/svg+xml",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background antialiased">
        <QueryProvider>
          <DashboardLayout>{children}</DashboardLayout>
        </QueryProvider>
      </body>
    </html>
  );
}
