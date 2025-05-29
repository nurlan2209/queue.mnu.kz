import React, { useState, useEffect, useRef } from 'react';
import { admissionAPI } from '../../api';
import { useTranslation } from 'react-i18next';
import AudioPlayer from '../AudioPlayer/AudioPlayer';
import './EmployeeStatusControl.css';

const EmployeeStatusControl = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [calledApplicant, setCalledApplicant] = useState(null);
  const [audioData, setAudioData] = useState(null);
  
  // Уникальный ID для каждого аудио, чтобы не перезапускалось при обновлениях
  const audioIdRef = useRef(null);

  // Функция для получения статуса сотрудника
  const fetchEmployeeStatus = async () => {
    try {
      setLoading(true);
      const response = await admissionAPI.getStatus();
      setStatus(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching employee status:', error);
      setError(t('employeeStatus.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeeStatus();
    
    // УВЕЛИЧИВАЕМ интервал до 30 секунд чтобы реже обновлялся
    const interval = setInterval(fetchEmployeeStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Функции для управления статусом
  const handleStartWork = async () => {
    try {
      setActionLoading(true);
      const response = await admissionAPI.startWork();
      setStatus(response.data);
      setError(null);
    } catch (error) {
      setError(t('employeeStatus.errorStarting'));
    } finally {
      setActionLoading(false);
    }
  };

  const handlePauseWork = async () => {
    try {
      setActionLoading(true);
      const response = await admissionAPI.pauseWork();
      setStatus(response.data);
      setError(null);
    } catch (error) {
      setError(t('employeeStatus.errorPausing'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeWork = async () => {
    try {
      setActionLoading(true);  
      const response = await admissionAPI.resumeWork();
      setStatus(response.data);
      setError(null);
    } catch (error) {
      setError(t('employeeStatus.errorResuming'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCallNext = async () => {
    console.log('🚀 Кнопка "Вызвать следующего" нажата');
    try {
      setActionLoading(true);
      const response = await admissionAPI.callNext();
      
      console.log('🔍 ПОЛНЫЙ ОТВЕТ ОТ API:', response.data);
      
      if (response.data.success === false) {
        console.log('📝 Нет абитуриентов в очереди');
        setError(response.data.message);
        setCalledApplicant(null);
      } else {
        console.log('👤 Найден абитуриент:', response.data.full_name);
        setCalledApplicant(response.data);
        setError(null);
        
        // СРАЗУ МЕНЯЕМ ЛОКАЛЬНЫЙ СТАТУС НА BUSY
        setStatus(prevStatus => ({ ...prevStatus, status: 'busy' }));
        
        console.log('🎤 РЕЧЕВЫЕ ДАННЫЕ:', response.data.speech);
        
        // Если есть аудио данные, воспроизводим их
        if (response.data.speech && response.data.speech.success) {
          console.log('🔊 АУДИО BASE64 найден, размер:', response.data.speech.audio_base64?.length);
          console.log('📝 ТЕКСТ ОБЪЯВЛЕНИЯ:', response.data.speech.text);
          
          // СОЗДАЕМ УНИКАЛЬНЫЙ ID для этого аудио
          audioIdRef.current = Date.now().toString();
          const audioInfo = {
            ...response.data.speech,
            audioId: audioIdRef.current
          };
          
          setAudioData(audioInfo);

          // **НОВОЕ**: Сохраняем аудио данные в localStorage для других страниц
          try {
            localStorage.setItem('currentAnnouncement', JSON.stringify({
              audioBase64: response.data.speech.audio_base64,
              text: response.data.speech.text,
              language: response.data.speech.language,
              timestamp: Date.now(),
              audioId: audioIdRef.current,
              queueNumber: response.data.queue_number,
              employeeName: response.data.assigned_employee_name,
              desk: response.data.employee_desk
            }));
            console.log('💾 Аудио данные сохранены в localStorage для других страниц');
          } catch (e) {
            console.error('❌ Ошибка сохранения аудио в localStorage:', e);
          }
        } else {
          console.log('❌ НЕТ АУДИО ДАННЫХ ИЛИ ОШИБКА:', response.data.speech);
        }
      }
      
      // НЕ ОБНОВЛЯЕМ статус сразу - пусть интервал сам обновит через 30 сек
      // await fetchEmployeeStatus();
    } catch (error) {
      console.error('💥 ОШИБКА В handleCallNext:', error);
      setError(t('employeeStatus.errorCallingNext'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteApplicant = async () => {
    try {
      setActionLoading(true);
      const response = await admissionAPI.completeCurrentApplicant();
      setStatus(response.data);
      setCalledApplicant(null);
      setAudioData(null);
      audioIdRef.current = null;
      
      // **НОВОЕ**: Очищаем аудио данные из localStorage
      localStorage.removeItem('currentAnnouncement');
      
      setError(null);
    } catch (error) {
      setError(t('employeeStatus.errorCompleting'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinishWork = async () => {
    try {
      setActionLoading(true);
      const response = await admissionAPI.finishWork();
      setStatus(response.data);
      setCalledApplicant(null);
      setAudioData(null);
      audioIdRef.current = null;
      
      // **НОВОЕ**: Очищаем аудио данные из localStorage
      localStorage.removeItem('currentAnnouncement');
      
      setError(null);
    } catch (error) {
      setError(t('employeeStatus.errorCompleting'));
    } finally {
      setActionLoading(false);
    }
  };

  // Обработчик окончания воспроизведения аудио
  const handleAudioEnded = () => {
    setAudioData(null);
    audioIdRef.current = null;
    
    // **НОВОЕ**: Очищаем аудио данные из localStorage после воспроизведения
    setTimeout(() => {
      localStorage.removeItem('currentAnnouncement');
    }, 1000);
  };

  if (loading) {
    return <div className="employee-status-loading">{t('employeeStatus.loading')}</div>;
  }

  if (!status) {
    return <div className="employee-status-error">{t('employeeStatus.errorLoading')}</div>;
  }

  const getStatusText = (statusValue) => {
    const statusMap = {
      'available': t('employeeStatus.available'),
      'busy': t('employeeStatus.busy'),
      'paused': t('employeeStatus.paused'),
      'offline': t('employeeStatus.offline')
    };
    return statusMap[statusValue] || t('employeeStatus.unknown');
  };

  return (
    <div className="employee-status-control">
      <div className="status-header">
        <h3>{t('employeeStatus.title')}</h3>
        <div className={`status-indicator status-${status.status}`}>
          {getStatusText(status.status)}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {calledApplicant && (
        <div className="called-applicant">
          <h4>Вызванный абитуриент:</h4>
          <div className="applicant-info">
            <p><strong>Номер:</strong> {calledApplicant.queue_number}</p>
            <p><strong>ФИО:</strong> {calledApplicant.full_name}</p>
            <p><strong>Телефон:</strong> {calledApplicant.phone}</p>
            <p><strong>Стол:</strong> {calledApplicant.employee_desk}</p>
            {calledApplicant.speech && calledApplicant.speech.text && (
              <p><strong>Объявление:</strong> {calledApplicant.speech.text}</p>
            )}
          </div>
        </div>
      )}

      <div className="status-actions">
        {status.status === 'offline' && (
          <button
            className="btn btn-success"
            onClick={handleStartWork}
            disabled={actionLoading}
          >
            {t('employeeStatus.startWork')}
          </button>
        )}

        {status.status === 'available' && (
          <>
            <button
              className="btn btn-primary"
              onClick={handleCallNext}
              disabled={actionLoading}
            >
              {t('employeeStatus.callNext')}
            </button>
            <button
              className="btn btn-warning"
              onClick={handlePauseWork}
              disabled={actionLoading}
            >
              {t('employeeStatus.pauseWork')}
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleFinishWork}
              disabled={actionLoading}
            >
              {t('employeeStatus.finishWork')}
            </button>
          </>
        )}

        {/* ПОКАЗЫВАЕМ КНОПКУ ЗАВЕРШИТЬ ЕСЛИ СТАТУС BUSY ИЛИ ЕСТЬ ВЫЗВАННЫЙ АБИТУРИЕНТ */}
        {(status.status === 'busy' || calledApplicant) && (
          <button
            className="btn btn-success"
            onClick={handleCompleteApplicant}
            disabled={actionLoading}
          >
            {t('employeeStatus.completeApplicant')}
          </button>
        )}

        {status.status === 'paused' && (
          <button
            className="btn btn-primary"
            onClick={handleResumeWork}
            disabled={actionLoading}
          >
            {t('employeeStatus.resumeWork')}
          </button>
        )}
      </div>

      {/* Аудиоплеер для воспроизведения объявлений - используем audioId как key */}
      {audioData && audioData.audio_base64 && (
        <AudioPlayer
          key={audioData.audioId} // Уникальный key предотвращает перезапуск
          audioBase64={audioData.audio_base64}
          onEnded={handleAudioEnded}
          autoPlay={true}
        />
      )}
    </div>
  );
};

export default EmployeeStatusControl;