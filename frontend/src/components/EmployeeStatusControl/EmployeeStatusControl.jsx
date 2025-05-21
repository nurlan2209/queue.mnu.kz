import React, { useState, useEffect } from 'react';
import { admissionAPI } from '../../api';
import { useTranslation } from 'react-i18next';
import './EmployeeStatusControl.css';

const EmployeeStatusControl = ({ onStatusChange }) => {
  const { t } = useTranslation();
  const [employeeStatus, setEmployeeStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Загрузка статуса сотрудника
  const fetchEmployeeStatus = async () => {
    try {
      setLoading(true);
      const response = await admissionAPI.getStatus();
      setEmployeeStatus(response.data.status);
      setError(null);
      onStatusChange && onStatusChange(response.data.status);
    } catch (err) {
      setError(t('employeeStatus.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeeStatus();
    
    // Обновляем каждые 30 секунд
    const interval = setInterval(fetchEmployeeStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Обработчики для изменения статуса
  const handleStartWork = async () => {
    try {
      setLoading(true);
      await admissionAPI.startWork();
      fetchEmployeeStatus();
    } catch (err) {
      setError(t('employeeStatus.errorStarting'));
    } finally {
      setLoading(false);
    }
  };

  const handlePauseWork = async () => {
    try {
      setLoading(true);
      await admissionAPI.pauseWork();
      fetchEmployeeStatus();
    } catch (err) {
      setError(t('employeeStatus.errorPausing'));
    } finally {
      setLoading(false);
    }
  };

  const handleResumeWork = async () => {
    try {
      setLoading(true);
      await admissionAPI.resumeWork();
      fetchEmployeeStatus();
    } catch (err) {
      setError(t('employeeStatus.errorResuming'));
    } finally {
      setLoading(false);
    }
  };

  const handleCallNext = async () => {
    try {
      setLoading(true);
      const response = await admissionAPI.callNext();
      
      // Проверяем, содержит ли ответ сообщение (пустая очередь)
      if (response.data && response.data.status === 'empty_queue') {
        setError(response.data.message);
      } else {
        // Обычная обработка после успешного вызова
        setError(null);
      }
      
      fetchEmployeeStatus();
    } catch (err) {
      setError(t('employeeStatus.errorCallingNext'));
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteCurrentApplicant = async () => {
    try {
      setLoading(true);
      await admissionAPI.completeCurrentApplicant();
      fetchEmployeeStatus();
    } catch (err) {
      setError(t('employeeStatus.errorCompleting'));
    } finally {
      setLoading(false);
    }
  };

  // Новый обработчик для завершения работы
  const handleFinishWork = async () => {
    try {
      setLoading(true);
      await admissionAPI.finishWork();
      fetchEmployeeStatus();
    } catch (err) {
      setError(t('employeeStatus.errorFinishing'));
    } finally {
      setLoading(false);
    }
  };

  // Получаем текст статуса
  const getStatusText = (status) => {
    switch (status) {
      case 'available':
        return t('employeeStatus.available');
      case 'busy':
        return t('employeeStatus.busy');
      case 'paused':
        return t('employeeStatus.paused');
      case 'offline':
        return t('employeeStatus.offline');
      default:
        return t('employeeStatus.unknown');
    }
  };

  if (loading && !employeeStatus) {
    return <div className="employee-status-loading">{t('employeeStatus.loading')}</div>;
  }

  return (
    <div className="employee-status-control">
      <div className="status-header">
        <h3>{t('employeeStatus.title')}</h3>
        <div className={`status-badge status-${employeeStatus}`}>
          {getStatusText(employeeStatus)}
        </div>
      </div>

      {error && <div className="status-error">{error}</div>}

      <div className="status-actions">
        {/* Показываем кнопки в зависимости от текущего статуса */}
        {employeeStatus === 'offline' && (
          <button
            className="btn btn-success status-btn"
            onClick={handleStartWork}
            disabled={loading}
          >
            {t('employeeStatus.startWork')}
          </button>
        )}

        {employeeStatus === 'available' && (
          <>
            <button
              className="btn btn-primary status-btn"
              onClick={handleCallNext}
              disabled={loading}
            >
              {t('employeeStatus.callNext')}
            </button>
            <button
              className="btn btn-warning status-btn"
              onClick={handlePauseWork}
              disabled={loading}
            >
              {t('employeeStatus.pauseWork')}
            </button>
            <button
              className="btn btn-danger status-btn"
              onClick={handleFinishWork}
              disabled={loading}
            >
              {t('employeeStatus.finishWork')}
            </button>
          </>
        )}

        {employeeStatus === 'busy' && (
          <button
            className="btn btn-success status-btn"
            onClick={handleCompleteCurrentApplicant}
            disabled={loading}
          >
            {t('employeeStatus.completeApplicant')}
          </button>
        )}

        {employeeStatus === 'paused' && (
          <>
            <button
              className="btn btn-primary status-btn"
              onClick={handleResumeWork}
              disabled={loading}
            >
              {t('employeeStatus.resumeWork')}
            </button>
            <button
              className="btn btn-danger status-btn"
              onClick={handleFinishWork}
              disabled={loading}
            >
              {t('employeeStatus.finishWork')}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default EmployeeStatusControl;