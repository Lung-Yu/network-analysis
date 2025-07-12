import React from 'react';
import './AlertsTable.css';

const AlertsTable = ({ alerts }) => {
  if (!alerts || alerts.length === 0) {
    return <div className="alerts-placeholder">No security alerts detected.</div>;
  }

  return (
    <div className="alerts-container">
      <h2>Security Alerts</h2>
      <table className="alerts-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Source IP</th>
            <th>Destination IP</th>
            <th>Protocol</th>
            <th>Severity</th>
            <th>Signature</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map((alert, index) => (
            <tr key={index} className={`severity-${alert.severity}`}>
              <td>{new Date(alert.timestamp).toLocaleString()}</td>
              <td>{alert.src_ip}:{alert.src_port}</td>
              <td>{alert.dest_ip}:{alert.dest_port}</td>
              <td>{alert.proto}</td>
              <td>{alert.severity}</td>
              <td>{alert.signature}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AlertsTable;
