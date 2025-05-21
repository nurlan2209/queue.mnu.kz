import React, { useState, useEffect } from 'react';
import QueueStatus from '../../components/QueueStatus/QueueStatus';
import { queueAPI } from '../../api';
import { useTranslation } from 'react-i18next';
import { FaChevronDown } from 'react-icons/fa';
import './ApplicantDashboard.css';

const ApplicantDashboard = () => {
  const { t, i18n } = useTranslation();
  const [inQueue, setInQueue] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const checkQueueStatus = async () => {
      try {
        await queueAPI.getStatus();
        setInQueue(true);
      } catch (err) {
        setInQueue(false);
      }
    };

    checkQueueStatus();
  }, []);

  const handleJoinQueue = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      await queueAPI.joinQueue({ notes });

      setSuccess(t('applicantDashboard.success'));
      setInQueue(true);
      setNotes('');
    } catch (err) {
      setError(err.response?.data?.detail || t('applicantDashboard.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleQueueStatusChange = (isInQueue) => {
    setInQueue(isInQueue);
  };

  // Обработчик смены языка
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="applicant-dashboard">

      <h1>{t('applicantDashboard.title')}</h1>

      <div className="dashboard-section">
        <h2>{t('applicantDashboard.statusTitle')}</h2>

        {inQueue ? (
          <QueueStatus onStatusChange={handleQueueStatusChange} />
        ) : (
          <div className="not-in-queue">
            <p>{t('applicantDashboard.notInQueue')}</p>
          </div>
        )}
      </div>

      <div className="dashboard-section">
        <h2>{t('applicantDashboard.joinTitle')}</h2>

        {success && <div className="alert alert-success">{success}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleJoinQueue} className="join-queue-form">
          <div className="form-group">
            <label htmlFor="notes">{t('applicantDashboard.notesLabel')}</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('applicantDashboard.notesPlaceholder')}
              rows="3"
            ></textarea>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || inQueue}
          >
            {loading ? t('applicantDashboard.loading') : t('applicantDashboard.joinButton')}
          </button>
        </form>
      </div>

      <div className="dashboard-section info-section">
        <h2>{t('applicantDashboard.infoTitle')}</h2>
        <div className="info-card">
          <h3>{t('applicantDashboard.howItWorksTitle')}</h3>
          <ol>
            <li>{t('applicantDashboard.step1')}</li>
            <li>{t('applicantDashboard.step2')}</li>
            <li>{t('applicantDashboard.step3')}</li>
            <li>{t('applicantDashboard.step4')}</li>
            <li>{t('applicantDashboard.step5')}</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default ApplicantDashboard;