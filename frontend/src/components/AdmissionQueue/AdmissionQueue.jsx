import React, { useState, useEffect, useCallback } from 'react';
import { admissionAPI } from '../../api';
import { debounce } from 'lodash';
import { FaSearch, FaFilter, FaSort, FaChevronDown } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import './AdmissionQueue.css';
import ProgramTranslator from '../ProgramTranslator/ProgramTranslator';

const AdmissionQueue = () => {
  const { t, i18n } = useTranslation();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState('full_name');
  const [deletingId, setDeletingId] = useState(null);
  const [sortBy, setSortBy] = useState('queue_number_asc');

  const fetchQueue = useCallback(
    debounce(async (filter, term, field, sort) => {
      try {
        setLoading(true);
        const params = {};
        if (filter !== 'all') params.status = filter;
        if (term && field !== 'programs') {
          const normalizedTerm = term.trim();
          params[field] = normalizedTerm;
        }

        const response = await admissionAPI.getQueue(params);
        let filteredQueue = response.data || [];

        if (term && field === 'programs') {
          const normalizedTerm = term.trim().toLowerCase();
          filteredQueue = filteredQueue.filter((entry) =>
            entry.programs.some((program) =>
              program.toLowerCase().includes(normalizedTerm)
            )
          );
        }

        let sortedQueue = [...filteredQueue];
        switch (sort) {
          case 'queue_number_asc':
            sortedQueue.sort((a, b) => a.queue_number - b.queue_number);
            break;
          case 'queue_number_desc':
            sortedQueue.sort((a, b) => b.queue_number - b.queue_number);
            break;
          case 'created_at_asc':
            sortedQueue.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            break;
          case 'created_at_desc':
            sortedQueue.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
          case 'status_asc':
            sortedQueue.sort((a, b) => a.status.localeCompare(b.status));
            break;
          case 'full_name_asc':
            sortedQueue.sort((a, b) => a.full_name.localeCompare(b.full_name));
            break;
          default:
            sortedQueue.sort((a, b) => a.queue_number - b.queue_number);
        }

        setQueue(sortedQueue);
        setError(null);
      } catch (err) {
        setError(t('admissionQueue.errorLoading'));
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  // 🔄 АВТООБНОВЛЕНИЕ списка заявок каждые 10 секунд
  useEffect(() => {
    fetchQueue(activeFilter, searchTerm, searchField, sortBy);
    
    // Устанавливаем интервал для автообновления каждые 10 секунд
    const interval = setInterval(() => {
      console.log('🔄 Автообновление списка заявок...');
      fetchQueue(activeFilter, searchTerm, searchField, sortBy);
    }, 10000);

    // 📡 СЛУШАЕМ СОБЫТИЯ от других компонентов
    const handleQueueUpdate = () => {
      console.log('📡 Получено событие обновления очереди');
      fetchQueue(activeFilter, searchTerm, searchField, sortBy);
    };

    window.addEventListener('queueUpdated', handleQueueUpdate);

    return () => {
      fetchQueue.cancel();
      clearInterval(interval);
      window.removeEventListener('queueUpdated', handleQueueUpdate);
    };
  }, [activeFilter, searchTerm, searchField, sortBy, fetchQueue]);

  const handleProcessNext = async () => {
    try {
      await admissionAPI.processNext();
      // 🔄 СРАЗУ ОБНОВЛЯЕМ список после действия
      fetchQueue(activeFilter, searchTerm, searchField, sortBy);
    } catch (err) {
      setError(t('admissionQueue.errorProcessing'));
    }
  };

  const handleUpdateStatus = async (queueId, status) => {
    try {
      await admissionAPI.updateEntry(queueId, { status });
      // 🔄 СРАЗУ ОБНОВЛЯЕМ список после действия
      fetchQueue(activeFilter, searchTerm, searchField, sortBy);
    } catch (err) {
      setError(t('admissionQueue.errorUpdatingStatus'));
    }
  };

  const handleDeleteEntry = async (queueId) => {
    if (!window.confirm(t('admissionQueue.confirmDelete'))) return;
    try {
      setDeletingId(queueId);
      await admissionAPI.deleteEntry(queueId);
      // 🔄 СРАЗУ ОБНОВЛЯЕМ список после действия
      fetchQueue(activeFilter, searchTerm, searchField, sortBy);
    } catch (err) {
      const errorMessage = err.response?.data?.detail
        ? Array.isArray(err.response.data.detail)
          ? err.response.data.detail.map((e) => e.msg).join('; ')
          : err.response.data.detail
        : err.message || t('admissionQueue.errorDeletingDefault');
      setError(`${t('admissionQueue.errorDeleting')} ${errorMessage}`);
    } finally {
      setDeletingId(null);
    }
  };

  // 🆕 НОВАЯ ФУНКЦИЯ для ручного обновления
  const handleRefresh = () => {
    console.log('🔄 Ручное обновление списка заявок...');
    fetchQueue(activeFilter, searchTerm, searchField, sortBy);
  };

  const getStatusText = (status) => {
    return t(`admissionQueue.status.${status}`);
  };

  const getStatusColor = (status) => {
    const colors = {
      'waiting': '#ffc107',      // Желтый
      'in_progress': '#007bff',  // Синий
      'completed': '#28a745',    // Зеленый
      'cancelled': '#dc3545'     // Красный
    };
    return colors[status] || '#6c757d';
  };

  // Обработчик смены языка
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="admission-queue">
      <div className="queue-controls">
        <div className="queue-header">
          <h2>{t('admissionQueue.title')}</h2>
          <div className="queue-actions">
            <button 
              className="btn btn-refresh"
              onClick={handleRefresh}
              disabled={loading}
              title="Обновить список заявок"
            >
              🔄 {loading ? 'Обновляем...' : 'Обновить'}
            </button>
            <div className="auto-refresh-info">
              📡 Автообновление каждые 10 сек
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <p className="loading-text">{t('admissionQueue.loading')}</p>
      ) : queue.length === 0 ? (
        <div className="empty-queue">
          <p>{t('admissionQueue.emptyQueue')}</p>
          <button className="btn btn-primary" onClick={handleRefresh}>
            🔄 Проверить снова
          </button>
        </div>
      ) : (
        <div className="queue-cards1">
          {queue.map((entry) => (
            <div key={entry.id} className={`queue-card1 status-${entry.status}`}>
              <div className="card-header1">
                <span className="queue-number1">
                  {t('admissionQueue.queueNumber', { number: entry.queue_number })}
                </span>
                <span 
                  className={`status-badge status-${entry.status}`}
                  style={{ backgroundColor: getStatusColor(entry.status) }}
                >
                  {getStatusText(entry.status)}
                </span>
              </div>
              <div className="card-body1">
                <p>
                  <strong>{t('admissionQueue.card.fullName')}</strong> {entry.full_name}
                </p>
                <p>
                  <strong>{t('admissionQueue.card.phone')}</strong> {entry.phone}
                </p>
                  <p>
                    <strong>{t('admissionQueue.card.programs')}</strong>{' '}
                    {entry.programs.map((program, index) => (
                      <React.Fragment key={program}>
                        <ProgramTranslator programCode={program} formLanguage={entry.form_language} />
                        {index < entry.programs.length - 1 && ', '}
                      </React.Fragment>
                    ))}
                  </p>
                <p>
                  <strong>{t('admissionQueue.card.time')}</strong>{' '}
                  {new Date(entry.created_at).toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : 'en-US', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}{' '}
                  {new Date(entry.created_at).toLocaleTimeString(i18n.language === 'ru' ? 'ru-RU' : 'en-US')}
                </p>
                
                {/* 🆕 ПОКАЗЫВАЕМ ВРЕМЯ ОБРАБОТКИ если заявка в процессе */}
                {entry.status === 'in_progress' && entry.processing_time && (
                  <p className="processing-time">
                    <strong>⏱️ Время обработки:</strong>{' '}
                    {Math.floor(entry.processing_time / 60)} мин {entry.processing_time % 60} сек
                  </p>
                )}
              </div>
              <div className="card-actions1">
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDeleteEntry(entry.id)}
                  disabled={deletingId === entry.id}
                >
                  {deletingId === entry.id
                    ? t('admissionQueue.actions.deleting')
                    : t('admissionQueue.actions.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdmissionQueue;