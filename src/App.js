import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HostSession from "./pages/HostSession";
import JoinSession from "./pages/JoinSession";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HostSession />} />
        <Route path="/join/:code" element={<JoinSession />} />
      </Routes>
    </Router>
  );
}

export default App;
