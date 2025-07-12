import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './HistoryList.css';

function HistoryList() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortColumn, setSortColumn] = useState('timestamp');
    const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc'
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10); // Number of items per page
    const [totalCount, setTotalCount] = useState(0); // Total number of records from backend

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            setError(null);
            try {
                const skip = (currentPage - 1) * itemsPerPage;
                const response = await axios.get(
                    `http://localhost:8000/api/history?skip=${skip}&limit=${itemsPerPage}`
                );
                setHistory(response.data.records);
                setTotalCount(response.data.total_count);
            } catch (err) {
                setError('Failed to fetch history. Please ensure the backend is running.');
                console.error('Error fetching history:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [currentPage, itemsPerPage]); // Re-fetch when page or itemsPerPage changes

    const sortedHistory = useMemo(() => {
        let sortableItems = [...history]; // Sort only the current page's data
        if (sortColumn !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortColumn];
                const bValue = b[sortColumn];

                if (sortColumn === 'timestamp') {
                    const dateA = new Date(aValue);
                    const dateB = new Date(bValue);
                    if (dateA < dateB) return sortDirection === 'asc' ? -1 : 1;
                    if (dateA > dateB) return sortDirection === 'asc' ? 1 : -1;
                    return 0;
                } else if (typeof aValue === 'string') {
                    return sortDirection === 'asc'
                        ? aValue.localeCompare(bValue)
                        : bValue.localeCompare(aValue);
                } else {
                    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
                    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
                    return 0;
                }
            });
        }
        return sortableItems;
    }, [history, sortColumn, sortDirection]);

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc'); // Default to ascending when changing column
        }
    };

    const getSortIndicator = (column) => {
        if (sortColumn === column) {
            return sortDirection === 'asc' ? ' ▲' : ' ▼';
        } 
        return '';
    };

    const totalPages = Math.ceil(totalCount / itemsPerPage);

    const handlePageChange = (pageNumber) => {
        if (pageNumber > 0 && pageNumber <= totalPages) {
            setCurrentPage(pageNumber);
        }
    };

    const renderPageNumbers = () => {
        const pageNumbers = [];
        const maxPageButtons = 5; // Max number of page buttons to show
        let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

        if (endPage - startPage + 1 < maxPageButtons) {
            startPage = Math.max(1, endPage - maxPageButtons + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(
                <button
                    key={i}
                    onClick={() => handlePageChange(i)}
                    className={currentPage === i ? 'active' : ''}
                >
                    {i}
                </button>
            );
        }
        return pageNumbers;
    };

    if (loading) {
        return <div className="history-container">Loading history...</div>;
    }

    if (error) {
        return <div className="history-container error-message">{error}</div>;
    }

    return (
        <div className="history-container">
            <h2>Analysis History</h2>
            {totalCount === 0 ? (
                <p>No analysis records found. Upload a pcap file to start!</p>
            ) : (
                <>
                    <table className="history-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('id')}>ID{getSortIndicator('id')}</th>
                                <th onClick={() => handleSort('filename')}>File Name{getSortIndicator('filename')}</th>
                                <th onClick={() => handleSort('timestamp')}>Timestamp{getSortIndicator('timestamp')}</th>
                                <th onClick={() => handleSort('status')}>Status{getSortIndicator('status')}</th>
                                <th>Error Message</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedHistory.map((record) => (
                                <tr key={record.id}>
                                    <td>{record.id}</td>
                                    <td>{record.filename}</td>
                                    <td>{new Date(record.timestamp).toLocaleString()}</td>
                                    <td><span className={`status-${record.status}`}>{record.status}</span></td>
                                    <td>{record.error_message || '-'}</td>
                                    <td>
                                        <Link to={`/history/${record.id}`} className="view-details-link">View Details</Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="pagination-controls">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </button>
                        {renderPageNumbers()}
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

export default HistoryList;
