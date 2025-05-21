import React, { useState } from 'react';
import { queueAPI } from '../../api';
import { useTranslation } from 'react-i18next';
import './QueueStatusCheck.css';

const QueueStatusCheck = () => {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState('');
  const [queueEntry, setQueueEntry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCheckQueue = async (e) => {
    e.preventDefault();

    if (!fullName.trim()) {
      setError(t('queueStatusCheck.enterFullName'));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setQueueEntry(null);

      const response = await queueAPI.checkQueueByName(fullName);
      setQueueEntry(response.data);
      setIsModalOpen(true);
    } catch (err) {
      setError(err.response?.data?.detail || t('queueStatusCheck.notFound'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelQueue = async (queueId) => {
    if (!window.confirm(t('queueStatusCheck.confirmCancel'))) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      await queueAPI.cancelQueueById(queueId);
      setSuccess(t('queueStatusCheck.successCancel'));
      setQueueEntry(null);
      setIsModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.detail || t('queueStatusCheck.errorCancel'));
    } finally {
      setLoading(false);
    }
  };

  const handleMoveBack = async (queueId) => {
    if (!window.confirm(t('queueStatusCheck.confirmMoveBack'))) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await queueAPI.moveBackInQueue(queueId);
      setQueueEntry(response.data);
      setSuccess(t('queueStatusCheck.successMoveBack'));
    } catch (err) {
      setError(err.response?.data?.detail || t('queueStatusCheck.errorMoveBack'));
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const getStatusText = (status) => {
    return t(`queueStatusCheck.status.${status}`);
  };

  return (
    <div className="queue-status-check">
      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleCheckQueue} className="status-check-form">
        <div className="form-group">
          <label htmlFor="fullName">{t('queueStatusCheck.fullNameLabel')}</label>
          <div className="input-with-button">
            <input
              type="text"
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t('queueStatusCheck.fullNamePlaceholder')}
              disabled={loading}
            />
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? t('queueStatusCheck.searching') : t('queueStatusCheck.checkButton')}
            </button>
          </div>
        </div>
      </form>

      {isModalOpen && queueEntry && (
        <div className="status-modal-overlay" onClick={closeModal}>
          <div className="status-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={closeModal}>
              &times;
            </button>

            <div className="modal-header">
              <h3>{t('queueStatusCheck.modalTitle')}</h3>
              <span className={`status-badge status-${queueEntry.status}`}>
                {getStatusText(queueEntry.status)}
              </span>
            </div>

            <div className="modal-body">
              <div className="info-row">
                <span className="info-label">{t('queueStatusCheck.modal.fullName')}</span>
                <span className="info-value">{queueEntry.full_name}</span>
              </div>

              <div className="info-row">
                <span className="info-label">{t('queueStatusCheck.modal.phone')}</span>
                <span className="info-value">{queueEntry.phone}</span>
              </div>

              <div className="info-row">
                <span className="info-label">{t('queueStatusCheck.modal.queueNumber')}</span>
                <span className="info-value">{queueEntry.queue_number}</span>
              </div>

              <div className="info-row">
                <span className="info-label">{t('queueStatusCheck.modal.programs')}</span>
                <span className="info-value">{queueEntry.programs.join(', ')}</span>
              </div>

              {queueEntry.position && (
                <div className="info-row">
                  <span className="info-label">{t('queueStatusCheck.modal.position')}</span>
                  <span className="info-value">{queueEntry.position}</span>
                </div>
              )}

              {queueEntry.people_ahead !== undefined && (
                <div className="info-row">
                  <span className="info-label">{t('queueStatusCheck.modal.peopleAhead')}</span>
                  <span className="info-value">{queueEntry.people_ahead}</span>
                </div>
              )}

              {queueEntry.estimated_time && (
                <div className="info-row">
                  <span className="info-label">{t('queueStatusCheck.modal.estimatedTime')}</span>
                  <span className="info-value">
                    {queueEntry.estimated_time} {t('queueStatusCheck.modal.minutes')}
                  </span>
                </div>
              )}

              <div className="info-row">
                <span className="info-label">{t('queueStatusCheck.modal.createdAt')}</span>
                <span className="info-value">
                  {new Date(queueEntry.created_at).toLocaleString('ru-RU')}
                </span>
              </div>
            </div>

            <div className="modal-footer">
              {queueEntry.status === 'waiting' && (
                <button
                  className="btn btn-warning"
                  onClick={() => handleMoveBack(queueEntry.id)}
                  disabled={loading}
                >
                  {loading
                    ? t('queueStatusCheck.modal.processing')
                    : t('queueStatusCheck.modal.moveBackButton')}
                </button>
              )}

              {(queueEntry.status === 'waiting' || queueEntry.status === 'in_progress') && (
                <button
                  className="btn btn-danger"
                  onClick={() => handleCancelQueue(queueEntry.id)}
                  disabled={loading}
                >
                  {loading
                    ? t('queueStatusCheck.modal.canceling')
                    : t('queueStatusCheck.modal.cancelButton')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueueStatusCheck;