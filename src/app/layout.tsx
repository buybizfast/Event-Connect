import "./globals.css";
import { Inter } from "next/font/google";
import { Metadata } from "next";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { Toaster } from "react-hot-toast";
import ErrorSuppressor from "@/components/ErrorSuppressor";
import DebugIndicator from "@/components/DebugIndicator";
import "@/lib/utils/initErrorSuppression";
import ClientErrorSuppressor from "./ClientErrorSuppressor";
import ClearCacheButton from "@/components/ClearCacheButton";
import EmergencyResetButton from "@/components/EmergencyResetButton";
import DiagnosticModal from "@/components/DiagnosticModal";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Event Directory & Networking",
  description: "AI-Powered Event Networking Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientErrorSuppressor />
        <AuthProvider>
          <ErrorSuppressor />
          <main className="min-h-screen bg-gray-50">
            {children}
          </main>
          <Toaster position="bottom-right" />
          <DebugIndicator />
          <ClearCacheButton />
          <EmergencyResetButton />
          <DiagnosticModal />
        </AuthProvider>
      </body>
    </html>
  );
}
