import { AppShell } from "@/components/layout/app-shell";
import { SwrProvider } from "@/components/providers/swr-provider";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SwrProvider>
      <AppShell>{children}</AppShell>
    </SwrProvider>
  );
}
