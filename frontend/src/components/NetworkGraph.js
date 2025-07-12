import React, { useEffect, useRef } from 'react';
import { Network } from 'vis-network';
import './NetworkGraph.css';

const NetworkGraph = ({ data }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current && data && (data.nodes.length > 0 || data.edges.length > 0)) {
      const network = new Network(containerRef.current, data, {
        nodes: {
          shape: 'dot',
          size: 16,
          font: {
            size: 14,
            color: '#333'
          },
          borderWidth: 2,
        },
        edges: {
          width: 2,
          color: {
            color: '#848484',
            highlight: '#007bff',
          },
          arrows: {
            to: { enabled: false } // Connections are often bidirectional
          }
        },
        physics: {
          enabled: true,
          barnesHut: {
            gravitationalConstant: -3000,
            centralGravity: 0.3,
            springLength: 95,
            springConstant: 0.04,
            damping: 0.09,
            avoidOverlap: 0.1
          },
          solver: 'barnesHut'
        },
        interaction: {
          hover: true,
          tooltipDelay: 200,
        },
        height: '500px',
      });
      return () => {
        network.destroy();
      };
    }
  }, [data]);

  if (!data || data.nodes.length === 0) {
    return <div className="graph-placeholder">No network data to display.</div>;
  }

  return <div ref={containerRef} className="network-graph-container" />;
};

export default NetworkGraph;
