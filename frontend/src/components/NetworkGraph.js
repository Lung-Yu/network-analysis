import React, { useEffect, useRef } from 'react';
import { Network } from 'vis-network';
import './NetworkGraph.css';

const NetworkGraph = ({ data }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current && data && (data.nodes.length > 0 || data.edges.length > 0)) {
      
      // --- Enhance nodes with detailed tooltips ---
      const enhancedNodes = data.nodes.map(node => {
        let title = `<b>IP: ${node.label}</b>`;
        if (node.group === 'external') {
          title += `<br>--------------------`;
          title += `<br>Country: ${node.country || 'N/A'}`;
          title += `<br>ISP: ${node.isp || 'N/A'}`;
          title += `<br>Usage Type: ${node.usageType || 'N/A'}`;
          title += `<br>Abuse Score: ${node.abuseScore !== undefined ? node.abuseScore : 'N/A'}`;
        }
        return { ...node, title };
      });

      const enhancedData = {
        nodes: enhancedNodes,
        edges: data.edges
      };

      const network = new Network(containerRef.current, enhancedData, {
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
            to: { enabled: false }
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
