import { AppShell } from "@/components/layout/AppShell";
import { ViewerProvider } from "@/context/ViewerContext";
import { MasteryProvider } from "@/context/MasteryContext";
import { CommunityProvider } from "@/context/CommunityContext";
import { AuthGate } from "@/components/auth/AuthGate";

export default function Home() {
  return (
    <AuthGate>
      <CommunityProvider>
        <ViewerProvider>
          <MasteryProvider>
            <AppShell />
          </MasteryProvider>
        </ViewerProvider>
      </CommunityProvider>
    </AuthGate>
  );
}
