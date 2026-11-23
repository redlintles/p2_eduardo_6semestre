import { AppHeader } from "@/components/AppHeader/AppHeader";
import { Dashboard } from "@/components/Dashboard/Dashboard";

export default function HomePage() {
  return (
    <main className="page__main">
      <AppHeader />
      <Dashboard />
    </main>
  );
}
