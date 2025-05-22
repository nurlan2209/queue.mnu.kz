import React, { useState, useEffect } from 'react';
import { queueAPI, publicAPI } from '../../api';
import { useTranslation } from 'react-i18next';
import './QueueDisplay.css';

const QueueDisplay = () => {
  const { t } = useTranslation();
  const [queueEntries, setQueueEntries] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [videoSettings, setVideoSettings] = useState({
    youtube_url: '',
    is_enabled: false
  });
  
  // Функция для извлечения YouTube ID из URL
  const extractYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };
  
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

  // Функция для получения настроек видео
  const fetchVideoSettings = async () => {
    try {
      const response = await publicAPI.getVideoSettings();
      setVideoSettings(response.data);
    } catch (error) {
      console.error('Ошибка при получении настроек видео:', error);
    }
  };
  
  // Обновляем данные каждые 5 секунд
  useEffect(() => {
    fetchQueueData();
    fetchVideoSettings();
    
    const interval = setInterval(() => {
      fetchQueueData();
      fetchVideoSettings();
      setCurrentTime(new Date());
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const videoId = videoSettings.youtube_url ? extractYouTubeId(videoSettings.youtube_url) : null;
  
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
      
      {/* Блок с видео внизу экрана */}
      {videoSettings.is_enabled && videoId && (
        <div className="video-section">
          <div className="video-container">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&modestbranding=1`}
              title="Information Video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}
      
      <div className="display-footer">
        <p>{t('queueDisplay.waitMessage')}</p>
      </div>
    </div>
  );
};

export default QueueDisplay;