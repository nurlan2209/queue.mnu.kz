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

  const getCardColorClass = (status) => {
    switch (status) {
      case 'available':
        return 'card-blue';
      case 'paused':
        return 'card-green';
      case 'busy':
        return 'card-purple';
      default:
        return 'card-blue';
    }
  };

  const videoId = videoSettings.youtube_url ? extractYouTubeId(videoSettings.youtube_url) : null;

  return (
    <div className="queue-display">
      <header className="display-header">
        <div className="header-texts">
          <h1 className="main-title">ЭЛЕКТРОННАЯ ОЧЕРЕДЬ</h1>
          <h2 className="sub-title">ПРИЕМНОЙ КОМИССИИ MNU</h2>
          <div className="wait-message">Пожалуйста, ожидайте вызова вашего талона.</div>
        </div>
        <div className="header-meta">
          <img src="/logo_blue.svg" alt="MNU Logo" className="mnu-logo" />
          <div className="display-time-box">
            {currentTime.toLocaleTimeString('ru-RU', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      </header>

      <div className="queue-entries">
        {queueEntries.map((entry) => (
          <div
            key={entry.id}
            className={`queue-card ${getCardColorClass(entry.employee_status)}`}
          >
            <div className="queue-card-header">
              <div className="queue-label">№ ТАЛОНА</div>
              <div className="desk-label">№ КОНСУЛЬТАНТА</div>
            </div>
            <div className="queue-card-values">
              <div className="queue-number">{entry.queue_number}</div>
              <div className="desk-number">{entry.employee_desk}</div>
            </div>
            <div className="consultant-name">{entry.assigned_employee_name}</div>
          </div>
        ))}
      </div>

      {/* Блок с видео внизу экрана */}
      {videoSettings.is_enabled && videoId && (
        <div className="video-section" style={{ alignSelf: 'flex-end', marginTop: 'auto' }}>
          <div className="video-container">
            <iframe
              ref={iframeRef}
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&modestbranding=1&enablejsapi=1`}
              title="Information Video"
              frameBorder="0"
              allow="autoplay; encrypted-media"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueueDisplay;
