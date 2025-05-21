import React, { useState, useEffect } from 'react';
import { queueAPI } from '../../api';
import { useTranslation } from 'react-i18next';
import { FaChevronDown } from 'react-icons/fa';
import './QueueStatus.css';

const QueueStatus = ({ onStatusChange }) => {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        const response = await queueAPI.getStatus();
        setStatus(response.data);
        onStatusChange && onStatusChange(true);
        setError(null);
      } catch (err) {
        setError(t('queueStatus.notInQueue'));
        onStatusChange && onStatusChange(false);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();

    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [onStatusChange]);

  const handleCancelQueue = async () => {
    try {
      setLoading(true);
      await queueAPI.cancelQueue();
      setError(t('queueStatus.notInQueue'));
      setStatus(null);
      onStatusChange && onStatusChange(false);
    } catch (err) {
      // Оставляем текущий статус
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (statusCode) => {
    return t(`queueStatus.status.${statusCode}`);
  };

  // Обработчик смены языка
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  if (loading) {
    return <div className="queue-status-loading">{t('queueStatus.loading')}</div>;
  }

  if (error) {
    return (
      <div className="queue-status-container">
        <div className="queue-status-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="queue-status-container">

      <h2>{t('queueStatus.title')}</h2>

      <div className={`status-badge status-${status.status}`}>
        {getStatusText(status.status)}
      </div>

      <div className="queue-info">
        {status.status === 'waiting' && (
          <>
            <p className="position">
              <span>{t('queueStatus.positionLabel')}</span> {status.queue_position}{' '}
              {t('queueStatus.of')} {status.total_waiting}
            </p>
            <p className="wait-time">
              <span>{t('queueStatus.waitTimeLabel')}</span>{' '}
              {status.estimated_wait_time
                ? `${status.estimated_wait_time} ${t('queueStatus.minutes')}`
                : t('queueStatus.unknown')}
            </p>
          </>
        )}

        {status.status === 'in_progress' && (
          <p className="in-progress-message">{t('queueStatus.inProgressMessage')}</p>
        )}

        <button onClick={handleCancelQueue} className="btn btn-danger cancel-queue-btn">
          {t('queueStatus.cancelButton')}
        </button>
      </div>
    </div>
  );
};

export default QueueStatus;