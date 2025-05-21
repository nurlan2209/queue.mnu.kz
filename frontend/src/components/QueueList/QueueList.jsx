import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import { useTranslation } from 'react-i18next';
import ProgramTranslator from '../ProgramTranslator/ProgramTranslator';
import './QueueList.css';

const QueueList = () => {
  const { t } = useTranslation();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    date: '',
    employee: ''
  });

  // Загрузка заявок
    const loadQueue = async () => {
    try {
        setLoading(true);
        const params = {};
        if (filters.status) params.status = filters.status;
        if (filters.date) params.date = filters.date;
        if (filters.employee) params.employee = filters.employee;
        
        const response = await adminAPI.getAllQueue(params);
        // Проверить, является ли response массивом
        setQueue(Array.isArray(response) ? response : []);
    } catch (err) {
        setError(err.response?.data?.detail || t('queueList.loadError'));
        // Установить пустой массив в случае ошибки
        setQueue([]);
    } finally {
        setLoading(false);
    }
    };

  useEffect(() => {
    loadQueue();
  }, [filters]);

  // Обработчик изменения фильтров
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
  };

  // Экспорт в Excel
  const handleExportToExcel = async () => {
    try {
      const response = await adminAPI.exportQueueToExcel();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'queue_data.xlsx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError(err.response?.data?.detail || t('queueList.exportError'));
    }
  };

  // Форматирование времени (из секунд в часы, минуты, секунды)
  const formatTime = (seconds) => {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    let result = '';
    if (hours > 0) result += `${hours}ч `;
    if (minutes > 0) result += `${minutes}м `;
    result += `${remainingSeconds}с`;
    return result;
  };

  // Форматирование даты и времени
  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '-';
    const date = new Date(dateTimeStr);
    return date.toLocaleString();
  };

  // Получение переведенного статуса заявки
  const getTranslatedStatus = (status) => {
    if (!status) return t('admissionQueue.status.unknown');
    
    switch (status) {
      case 'waiting':
        return t('admissionQueue.status.waiting');
      case 'in_progress':
        return t('admissionQueue.status.in_progress');
      case 'completed':
        return t('admissionQueue.status.completed');
      case 'paused':
        return t('admissionQueue.status.paused');
      case 'cancelled':
        return t('admissionQueue.status.cancelled');
      default:
        return t('admissionQueue.status.unknown');
    }
  };

  return (
    <div className="queue-list-container">
      <h2>{t('queueList.title')}</h2>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      {/* Фильтры */}
      <div className="filters-container">
        <div className="filter-group">
          <label htmlFor="status">{t('queueList.statusFilter')}</label>
          <select
            id="status"
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
          >
            <option value="">{t('queueList.allStatuses')}</option>
            <option value="waiting">{t('queueList.waiting')}</option>
            <option value="in_progress">{t('queueList.inProgress')}</option>
            <option value="completed">{t('queueList.completed')}</option>
            <option value="paused">{t('queueList.paused')}</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="date">{t('queueList.dateFilter')}</label>
          <input
            type="date"
            id="date"
            name="date"
            value={filters.date}
            onChange={handleFilterChange}
          />
        </div>
        
        <div className="filter-group">
          <label htmlFor="employee">{t('queueList.employeeFilter')}</label>
          <input
            type="text"
            id="employee"
            name="employee"
            placeholder={t('queueList.employeePlaceholder')}
            value={filters.employee}
            onChange={handleFilterChange}
          />
        </div>
        
        <button className="btn btn-primary export-btn" onClick={handleExportToExcel}>
          {t('queueList.exportButton')}
        </button>
      </div>
      
      {/* Таблица заявок */}
      <div className="queue-table">
        {loading ? (
          <p>{t('queueList.loading')}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t('queueList.fullName')}</th>
                <th>{t('queueList.programs')}</th>
                <th>{t('queueList.queueNumber')}</th>
                <th>{t('queueList.employee')}</th>
                <th>{t('queueList.dateCreated')}</th>
                <th>{t('queueList.status')}</th>
                <th>{t('queueList.processingTime')}</th>
              </tr>
            </thead>
            <tbody>
                {queue && Array.isArray(queue) && queue.length === 0 ? (
                <tr>
                    <td colSpan="7">{t('queueList.noEntries')}</td>
                </tr>
                ) : (
                queue && Array.isArray(queue) && queue.map((entry) => (
                    <tr key={entry.id}>
                    <td>{entry.full_name}</td>
                    <td>
                        {Array.isArray(entry.programs) ? 
                        entry.programs.map((program, index) => (
                            <React.Fragment key={program}>
                            <ProgramTranslator programCode={program} formLanguage={entry.form_language} />
                            {index < entry.programs.length - 1 && ', '}
                            </React.Fragment>
                        )) : 
                        entry.programs
                        }
                    </td>
                    <td>{entry.queue_number}</td>
                    <td>{entry.assigned_employee_name || '-'}</td>
                    <td>{formatDateTime(entry.created_at)}</td>
                    <td>{getTranslatedStatus(entry.status)}</td>
                    <td>{formatTime(entry.processing_time)}</td>
                    </tr>
                ))
                )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default QueueList;