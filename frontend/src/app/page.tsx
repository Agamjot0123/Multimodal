import { AppShell } from "@/components/layout/AppShell";
import { ViewerProvider } from "@/context/ViewerContext";
import { MOCK_SOURCES } from "@/data/mockCourse";

export default function Home() {
  // TODO(Day 9): fetch sources from Member 2's /courses/{id}/sources endpoint.
  return (
    <ViewerProvider sources={MOCK_SOURCES}>
      <AppShell />
    </ViewerProvider>
  );
}
