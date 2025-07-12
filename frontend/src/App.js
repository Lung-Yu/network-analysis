import React, { useState } from 'react';
import axios from 'axios';
import './App.css';
import NetworkGraph from './components/NetworkGraph';
import AlertsTable from './components/AlertsTable';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const onFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setAnalysisResult(null); // Reset previous results
    setMessage('');
  };

  const onFileUpload = () => {
    if (!selectedFile) {
      setMessage('Please select a file first.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    setMessage('Uploading and analyzing... This may take a moment.');
    setIsLoading(true);

    axios.post('/api/upload', formData)
      .then((response) => {
        setMessage(`Analysis complete for ${response.data.filename}.`);
        setAnalysisResult(response.data.data);
        console.log('Analysis data:', response.data.data);
      })
      .catch((error) => {
        const errorMsg = error.response?.data?.detail || error.message;
        setMessage(`Error: ${errorMsg}`);
        console.error('Analysis error:', error);
        setAnalysisResult(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Network Packet Analysis</h1>
        <p>Upload a .pcap file to analyze network traffic and detect potential threats.</p>
      </header>
      
      <div className="upload-section">
        <input type="file" onChange={onFileChange} disabled={isLoading} />
        <button onClick={onFileUpload} disabled={isLoading}>
          {isLoading ? 'Analyzing...' : 'Analyze Packet'}
        </button>
      </div>

      {message && <p className={`message ${isLoading ? 'loading' : ''}`}>{message}</p>}

      {analysisResult && (
        <div className="results-section">
          <div className="graph-section">
            <h2>Network Graph</h2>
            <NetworkGraph data={{ nodes: analysisResult.nodes, edges: analysisResult.edges }} />
          </div>
          <div className="alerts-section">
            <AlertsTable alerts={analysisResult.alerts} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;