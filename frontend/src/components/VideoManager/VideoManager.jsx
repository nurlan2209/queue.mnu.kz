import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import { useTranslation } from 'react-i18next';
import './VideoManager.css';

const VideoManager = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState({
    youtube_url: '',
    is_enabled: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Функция для извлечения YouTube ID из URL
  const extractYouTubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Загрузка текущих настроек
  const fetchSettings = async () => {
    try {
      const response = await adminAPI.getVideoSettings();
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching video settings:', error);
      setError('Ошибка загрузки настроек видео');
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Валидация YouTube URL если видео включено
    if (settings.is_enabled && settings.youtube_url) {
      const videoId = extractYouTubeId(settings.youtube_url);
      if (!videoId) {
        setError('Пожалуйста, введите корректную ссылку на YouTube видео');
        setLoading(false);
        return;
      }
    }

    try {
      await adminAPI.updateVideoSettings(settings);
      setSuccess('Настройки видео успешно обновлены!');
    } catch (error) {
      setError('Ошибка при сохранении настроек');
      console.error('Error updating video settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const videoId = settings.youtube_url ? extractYouTubeId(settings.youtube_url) : null;

  return (
    <div className="video-manager">
      <h3>Управление видео на экране очереди</h3>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit} className="video-form">
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="is_enabled"
              checked={settings.is_enabled}
              onChange={handleChange}
            />
            Показывать видео на экране очереди
          </label>
        </div>

        {settings.is_enabled && (
          <div className="form-group">
            <label htmlFor="youtube_url">YouTube ссылка:</label>
            <input
              type="url"
              id="youtube_url"
              name="youtube_url"
              value={settings.youtube_url}
              onChange={handleChange}
              placeholder="https://www.youtube.com/watch?v=..."
              required={settings.is_enabled}
            />
            <small className="help-text">
              Вставьте ссылку на YouTube видео. Поддерживаются форматы:
              <br />• https://www.youtube.com/watch?v=VIDEO_ID
              <br />• https://youtu.be/VIDEO_ID
              <br />• https://www.youtube.com/embed/VIDEO_ID
            </small>
          </div>
        )}

        {videoId && settings.is_enabled && (
          <div className="video-preview">
            <h4>Предпросмотр видео:</h4>
            <div className="youtube-preview">
              <iframe
                width="320"
                height="180"
                src={`https://www.youtube.com/embed/${videoId}`}
                title="YouTube video preview"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Сохранение...' : 'Сохранить настройки'}
        </button>
      </form>
    </div>
  );
};

export default VideoManager;