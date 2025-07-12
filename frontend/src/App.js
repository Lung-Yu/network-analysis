import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import UploadPage from './components/UploadPage';
import HistoryList from './components/HistoryList';
import AnalysisDetail from './components/AnalysisDetail';

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="App-nav">
          <ul>
            <li>
              <Link to="/">Upload</Link>
            </li>
            <li>
              <Link to="/history">History</Link>
            </li>
          </ul>
        </nav>

        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/history" element={<HistoryList />} />
          <Route path="/history/:recordId" element={<AnalysisDetail />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
