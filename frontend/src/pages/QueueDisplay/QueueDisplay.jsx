// QueueDisplay.jsx - Обновленная версия с цветовой схемой программ

import React, { useState, useEffect, useRef } from 'react';
import { queueAPI, publicAPI } from '../../api';
import { useTranslation } from 'react-i18next';
import { getProgramCategoryFromArray, getProgramColors } from '../../utils/programColors';
import AudioPlayer from '../../components/AudioPlayer/AudioPlayer';
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
  const [currentAnnouncement, setCurrentAnnouncement] = useState(null);

  // Ссылки на элементы
  const iframeRef = useRef(null);
  const audioContextRef = useRef(null);
  const gainNodeRef = useRef(null);
  const processedAnnouncementsRef = useRef(new Set());

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
        const volume = shouldMute ? 10 : 100;
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
      allVideos.forEach(video => video.volume = shouldMute ? 0.15 : 1.0);
    } catch (error) {
      console.error('❌ Ошибка прямого управления video элементами:', error);
    }

    // Метод 3: Управление через Web Audio API
    if (gainNodeRef.current) {
      try {
        gainNodeRef.current.gain.value = shouldMute ? 0.15 : 1.0;
      } catch (error) {
        console.error('❌ Ошибка Web Audio API:', error);
      }
    }
  };

  // **НОВАЯ ФУНКЦИЯ**: Проверка новых объявлений в localStorage
  const checkForNewAnnouncements = () => {
    try {
      const storedAnnouncement = localStorage.getItem('currentAnnouncement');
      if (storedAnnouncement) {
        const announcement = JSON.parse(storedAnnouncement);
        
        // Проверяем, не обрабатывали ли мы уже это объявление
        if (!processedAnnouncementsRef.current.has(announcement.audioId)) {
          console.log('🔊 QueueDisplay: Найдено новое объявление:', announcement);
          
          // Добавляем в список обработанных
          processedAnnouncementsRef.current.add(announcement.audioId);
          
          // Воспроизводим аудио
          setCurrentAnnouncement(announcement);
          setIsAnnouncementPlaying(true);
          controlVideoVolume(true);
          
          // Очищаем старые обработанные объявления (оставляем только последние 10)
          if (processedAnnouncementsRef.current.size > 10) {
            const array = Array.from(processedAnnouncementsRef.current);
            processedAnnouncementsRef.current = new Set(array.slice(-10));
          }
        }
      }
    } catch (error) {
      console.error('❌ Ошибка проверки объявлений:', error);
    }
  };

  // **НОВАЯ ФУНКЦИЯ**: Обработчик окончания воспроизведения аудио
  const handleAnnouncementEnded = () => {
    console.log('🏁 QueueDisplay: Объявление закончилось');
    setCurrentAnnouncement(null);
    setIsAnnouncementPlaying(false);
    controlVideoVolume(false);
  };

  // Слушаем изменения в localStorage
  useEffect(() => {
    let lastTimestamp = 0;

    const handleStorageChange = (e) => {
      if (e.key === 'announcementStatus') {
        const status = JSON.parse(e.newValue || '{}');
        if (status.timestamp && Math.abs(status.timestamp - lastTimestamp) < 100) return;
        lastTimestamp = status.timestamp;

        console.log('📢 Статус объявления:', status.isPlaying ? 'НАЧАЛОСЬ' : 'ЗАКОНЧИЛОСЬ');

        setIsAnnouncementPlaying(status.isPlaying);
        controlVideoVolume(status.isPlaying);
      }
      
      // **НОВОЕ**: Слушаем изменения объявлений
      if (e.key === 'currentAnnouncement') {
        checkForNewAnnouncements();
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

    // **НОВОЕ**: Проверяем наличие объявлений при загрузке
    checkForNewAnnouncements();

    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Обновляем данные каждые 5 секунд
  useEffect(() => {
    fetchQueueData();
    fetchVideoSettings();

    const interval = setInterval(() => {
      fetchQueueData();
      fetchVideoSettings();
      setCurrentTime(new Date());
      
      // **НОВОЕ**: Периодически проверяем новые объявления
      checkForNewAnnouncements();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // НОВЫЕ ФУНКЦИИ: Получение цветовых классов на основе программ заявки
  const getCardColorClassByPrograms = (entry) => {
    // Если есть информация о программах в entry
    if (entry.programs && entry.programs.length > 0) {
      const programCategory = getProgramCategoryFromArray(entry.programs);
      const programColors = getProgramColors(entry.programs);
      
      // Возвращаем стили на основе программы, а не статуса сотрудника
      switch (programCategory) {
        case 'bachelor':
          return 'card-blue'; // Синий для бакалавриата
        case 'master':
          return 'card-green'; // Зеленый для магистратуры
        case 'doctorate':
          return 'card-purple'; // Фиолетовый для докторантуры
        default:
          return 'card-blue'; // По умолчанию синий
      }
    }
    
    // Fallback к старой логике, если нет информации о программах
    return getCardColorClass(entry.employee_status);
  };

  const getCardTextColorClassByPrograms = (entry) => {
    if (entry.programs && entry.programs.length > 0) {
      const programCategory = getProgramCategoryFromArray(entry.programs);
      
      switch (programCategory) {
        case 'bachelor':
          return 'text-blue';
        case 'master':
          return 'text-green';
        case 'doctorate':
          return 'text-purple';
        default:
          return 'text-blue';
      }
    }
    
    // Fallback к старой логике
    return getCardTextColorClass(entry.employee_status);
  };

  // Старые функции (оставляем для совместимости)
  const getCardColorClass = (status) => {
    switch (status) {
      case 'available': return 'card-blue';
      case 'paused': return 'card-green';
      case 'busy': return 'card-purple';
      default: return 'card-blue';
    }
  };

  const getCardTextColorClass = (status) => {
    switch (status) {
      case 'available': return 'text-blue';
      case 'paused': return 'text-green';
      case 'busy': return 'text-purple';
      default: return 'text-blue';
    }
  };

  const videoId = extractYouTubeId(videoSettings.youtube_url);

  return (
    <div className="queue-display">
      <header className="display-header">
        <div className="header-texts">
          <h1 className="main-title">ЭЛЕКТРОННАЯ ОЧЕРЕДЬ</h1>
          <h2 className="sub-title">ПРИЕМНОЙ КОМИССИИ MNU</h2>
          <div className="wait-message">Пожалуйста, ожидайте вызова вашего талона.</div>
        </div>
        <img src="/logo_blue.svg" alt="MNU Logo" className="fixed-logo" />
      </header>

      <div className="queue-entries">
        {queueEntries.map((entry) => {
          // ИСПОЛЬЗУЕМ НОВЫЕ ФУНКЦИИ для определения цвета по программам
          const colorClass = getCardColorClassByPrograms(entry);
          const textColorClass = getCardTextColorClassByPrograms(entry);
          
          return (
            <div key={entry.id} className={`queue-card ${colorClass}`}>
              <div className="queue-card-header">
                <div className={`queue-label ${textColorClass}`}>№ ТАЛОНА</div>
                <div className={`desk-label ${textColorClass}`}>№ КОНСУЛЬТАНТА</div>
              </div>
              <div className="queue-card-values">
                <div className={`queue-number ${textColorClass}`}>{entry.queue_number}</div>
                <div className="divider"></div>
                <div className="desk-info">
                  <div className={`desk-number ${textColorClass}`}>{entry.employee_desk}</div>
                  <div className={`consultant-name ${textColorClass}`} style={{ textTransform: 'uppercase' }}>
                    {entry.assigned_employee_name}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed-time">
        {currentTime.toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>

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

      {/* **НОВОЕ**: Аудиоплеер для воспроизведения объявлений на display странице */}
      {currentAnnouncement && currentAnnouncement.audioBase64 && (
        <AudioPlayer
          key={currentAnnouncement.audioId}
          audioBase64={currentAnnouncement.audioBase64}
          onEnded={handleAnnouncementEnded}
          autoPlay={true}
        />
      )}
    </div>
  );
};

export default QueueDisplay;