import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HostSession from "./pages/HostSession";
import JoinSession from "./pages/JoinSession";
import BroadcastView from "./pages/BroadcastView";


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HostSession />} />
        <Route path="/join/:code" element={<JoinSession />} />
		<Route path="/broadcast/:code" element={<BroadcastView />} />
      </Routes>
    </Router>
  );
}

export default App;
