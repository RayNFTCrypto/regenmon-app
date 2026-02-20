import { useLocalStorage } from "./hooks/useLocalStorage";
import { CreationFlow } from "./components/CreationFlow";
import { RegenmonCard } from "./components/RegenmonCard";
import "./App.css";

function App() {
  const [regenmon, setRegenmon] = useLocalStorage("my-regenmon", null);

  return (
    <div className="app">
      <header className="app-header">
        <span className="logo">Regenmon</span>
      </header>

      <main className="app-main">
        {regenmon ? (
          <RegenmonCard
            regenmon={regenmon}
            onRelease={() => setRegenmon(null)}
          />
        ) : (
          <CreationFlow onCreate={setRegenmon} />
        )}
      </main>

      <footer className="app-footer">
        <p>Bootcamp Regenmon — Sesión 1</p>
      </footer>
    </div>
  );
}

export default App;
