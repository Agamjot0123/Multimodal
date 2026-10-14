import { AppShell } from "@/components/layout/AppShell";
import { ViewerProvider } from "@/context/ViewerContext";
import { MasteryProvider } from "@/context/MasteryContext";
import { CommunityProvider } from "@/context/CommunityContext";
import { AuthGate } from "@/components/auth/AuthGate";
import { MOCK_SOURCES } from "@/data/mockCourse";

export default function Home() {
  // Backend has no sources endpoint yet; the course file list stays local.
  return (
    <AuthGate>
    <ViewerProvider sources={MOCK_SOURCES}>
      <MasteryProvider>
        <CommunityProvider>
          <AppShell />
        </CommunityProvider>
      </MasteryProvider>
    </ViewerProvider>
    </AuthGate>
  );
}
