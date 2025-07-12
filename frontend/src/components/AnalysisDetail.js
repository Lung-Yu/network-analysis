import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import AlertsTable from './AlertsTable';
import NetworkGraph from './NetworkGraph';
import './AnalysisDetail.css'; // Assuming you'll create this for styling

function AnalysisDetail() {
    const { recordId } = useParams();
    const [record, setRecord] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchRecord = async () => {
            try {
                const response = await axios.get(`http://localhost:8000/api/history/${recordId}`);
                setRecord(response.data);
            } catch (err) {
                setError('Failed to fetch analysis details. Please ensure the backend is running and the record ID is valid.');
                console.error('Error fetching analysis details:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchRecord();
    }, [recordId]);

    if (loading) {
        return <div className="detail-container">Loading analysis details...</div>;
    }

    if (error) {
        return <div className="detail-container error-message">{error}</div>;
    }

    if (!record) {
        return <div className="detail-container">No record found for ID: {recordId}</div>;
    }

    return (
        <div className="detail-container">
            <h2>Analysis Details for {record.filename} (ID: {record.id})</h2>
            <p>Status: <span className={`status-${record.status}`}>{record.status}</span></p>
            <p>Timestamp: {new Date(record.timestamp).toLocaleString()}</p>
            {record.error_message && (
                <p className="error-message">Error: {record.error_message}</p>
            )}

            {record.status === 'success' && record.analysis_data ? (
                <div className="analysis-data-section">
                    <h3>Network Alerts</h3>
                    <AlertsTable alerts={record.analysis_data.alerts} />

                    <h3>Network Graph</h3>
                    <NetworkGraph nodes={record.analysis_data.nodes} edges={record.analysis_data.edges} />
                </div>
            ) : (
                <p>No analysis data available for this record (status: {record.status}).</p>
            )}
        </div>
    );
}

export default AnalysisDetail;
