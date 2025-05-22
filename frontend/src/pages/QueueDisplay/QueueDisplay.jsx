import React, { useState, useEffect, useRef } from 'react';
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
  const [isAnnouncementPlaying, setIsAnnouncementPlaying] = useState(false);
  
  // Ссылки на элементы
  const iframeRef = useRef(null);
  const audioContextRef = useRef(null);
  const gainNodeRef = useRef(null);
  
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

  // Инициализация Web Audio API для управления громкостью
  const setupAudioContext = () => {
    try {
      if (!audioContextRef.current && window.AudioContext) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.connect(audioContextRef.current.destination);
        console.log('🎵 Audio Context настроен');
      }
    } catch (error) {
      console.error('❌ Ошибка настройки Audio Context:', error);
    }
  };

  // Управление громкостью через JavaScript
  const controlVideoVolume = (shouldMute) => {
    // Метод 1: Попытка через postMessage
    if (iframeRef.current) {
      try {
        const iframe = iframeRef.current;
        const volume = shouldMute ? 10 : 100; // 10% или 100%
        
        // Попытка отправить команду YouTube API
        iframe.contentWindow?.postMessage(
          `{"event":"command","func":"setVolume","args":[${volume}]}`,
          'https://www.youtube.com'
        );
        
        console.log(`🔊 Попытка установить громкость: ${volume}%`);
      } catch (error) {
        console.error('❌ Ошибка управления громкостью через postMessage:', error);
      }
    }

    // Метод 2: Прямое управление через DOM
    try {
      const allVideos = document.querySelectorAll('video');
      allVideos.forEach(video => {
        if (shouldMute) {
          video.volume = 0.15; // 15%
          console.log('🔇 Установлена громкость video элемента: 15%');
        } else {
          video.volume = 1.0; // 100%
          console.log('🔊 Восстановлена громкость video элемента: 100%');
        }
      });
    } catch (error) {
      console.error('❌ Ошибка прямого управления video элементами:', error);
    }

    // Метод 3: Управление через Web Audio API
    if (gainNodeRef.current) {
      try {
        const volume = shouldMute ? 0.15 : 1.0;
        gainNodeRef.current.gain.value = volume;
        console.log(`🎛️ Web Audio API громкость: ${volume * 100}%`);
      } catch (error) {
        console.error('❌ Ошибка Web Audio API:', error);
      }
    }
  };

  // Слушаем изменения в localStorage
  useEffect(() => {
    let lastTimestamp = 0;
    
    const handleStorageChange = (e) => {
      if (e.key === 'announcementStatus') {
        const status = JSON.parse(e.newValue || '{}');
        
        // Игнорируем быстрые дублирующиеся события
        if (status.timestamp && Math.abs(status.timestamp - lastTimestamp) < 100) {
          return;
        }
        lastTimestamp = status.timestamp;
        
        console.log('📢 Статус объявления:', status.isPlaying ? 'НАЧАЛОСЬ' : 'ЗАКОНЧИЛОСЬ');
        
        setIsAnnouncementPlaying(status.isPlaying);
        controlVideoVolume(status.isPlaying);
      }
    };

    // Инициализируем Audio Context
    setupAudioContext();

    // Слушаем изменения localStorage
    window.addEventListener('storage', handleStorageChange);

    // Проверяем текущий статус при загрузке
    const currentStatus = localStorage.getItem('announcementStatus');
    if (currentStatus) {
      try {
        const status = JSON.parse(currentStatus);
        setIsAnnouncementPlaying(status.isPlaying || false);
        controlVideoVolume(status.isPlaying || false);
      } catch (e) {
        console.error('Ошибка парсинга статуса:', e);
      }
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
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
        {isAnnouncementPlaying && <span style={{color: 'red', marginLeft: '20px'}}>📢 ОБЪЯВЛЕНИЕ</span>}
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
            const employeeName = entry.assigned_employee_name;
            const deskNumber = entry.employee_desk || t('queueDisplay.noDesk');
            
            return (
              <div className="queue-entry" key={entry.id}>
                <div className="entry-number">{entry.queue_number}</div>
                <div className="entry-arrow">→</div>
                <div className="entry-desk">{deskNumber}</div>
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
              ref={iframeRef}
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&loop=1&playlist=${videoId}&controls=1&showinfo=0&rel=0&modestbranding=1&enablejsapi=1&origin=${window.location.origin}`}
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