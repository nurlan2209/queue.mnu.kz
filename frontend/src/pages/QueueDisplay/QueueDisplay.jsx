import React, { useState, useEffect } from 'react';
import { queueAPI } from '../../api';
import { useTranslation } from 'react-i18next';
import './QueueDisplay.css';

const QueueDisplay = () => {
  const { t } = useTranslation();
  const [queueEntries, setQueueEntries] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Функция для получения данных очереди
  const fetchQueueData = async () => {
    try {
      setLoading(true);
      const response = await queueAPI.getDisplayQueue();
      setQueueEntries(response.data);
      setError(null);
    } catch (error) {
      console.error('Ошибка при получении данных очереди:', error);
      setError(t('queueDisplay.loadError'));
    } finally {
      setLoading(false);
    }
  };
  
  // Обновляем данные каждые 5 секунд
  useEffect(() => {
    fetchQueueData();
    
    const interval = setInterval(() => {
      fetchQueueData();
      setCurrentTime(new Date());
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="queue-display">
      <div className="display-header">
        <h1>{t('queueDisplay.title')}</h1>
        <div className="current-time">
          {currentTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      
      <div className="queue-entries">
        {loading && queueEntries.length === 0 ? (
          <div className="loading-message">{t('queueDisplay.loading')}</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : queueEntries.length === 0 ? (
          <div className="no-entries">{t('queueDisplay.noEntries')}</div>
        ) : (
          queueEntries.map(entry => {
            // Найдем стол сотрудника на основе имени
            const employeeName = entry.assigned_employee_name;
            const deskNumber = entry.employee_desk || t('queueDisplay.noDesk');
            
            return (
              <div className="queue-entry" key={entry.id}>
                <div className="entry-number">{entry.queue_number}</div>
                <div className="entry-arrow">→</div>
                <div className="entry-desk">
                  {deskNumber}
                </div>
                <div className="entry-details">
                  <div className="employee-name">{employeeName}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      <div className="display-footer">
        <p>{t('queueDisplay.waitMessage')}</p>
      </div>
    </div>
  );
};

export default QueueDisplay;