import { Provider } from "jotai";
import Uploader from "./components/Uploader";
import "./App.css";

function App() {
  return (
    <Provider>
      <div className="app">
        <Uploader />
      </div>
    </Provider>
  );
}

export default App;
