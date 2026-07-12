import InteractionForm from "./components/InteractionForm";
import AIAssistantChat from "./components/AIAssistantChat";
import "./App.css";

function App() {
  return (
    <div className="app">
      <div className="app__content">
        <InteractionForm />
        <AIAssistantChat />
      </div>
    </div>
  );
}

export default App;
