import React, { useState } from 'react';
import AdmissionQueue from '../../components/AdmissionQueue/AdmissionQueue';
import EmployeeStatusControl from '../../components/EmployeeStatusControl/EmployeeStatusControl';
import { useTranslation } from 'react-i18next';
import { FaChevronDown } from 'react-icons/fa';
import './AdmissionDashboard.css';

const AdmissionDashboard = () => {
  const { t, i18n } = useTranslation();
  const [employeeStatus, setEmployeeStatus] = useState(null);

  // Обработчик смены языка
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  // Обработчик изменения статуса сотрудника
  const handleStatusChange = (status) => {
    setEmployeeStatus(status);
  };

  return (
    <div className="admission-dashboard">
      <h1>{t('admissionDashboard.title')}</h1>

      <div className="dashboard-content">
        <div className="queue-management">
          {/* Добавляем компонент для управления статусом */}
          <EmployeeStatusControl onStatusChange={handleStatusChange} />
          
          <AdmissionQueue employeeStatus={employeeStatus} />
        </div>

        <div className="sidebar">
          <div className="sidebar-section">
            <h2>{t('admissionDashboard.instructionsTitle')}</h2>
            <div className="instruction-card">
              <h3>{t('admissionDashboard.queueManagementTitle')}</h3>
              <ul>
                <li>
                  <strong>{t('admissionDashboard.allFilter')}</strong> - {t('admissionDashboard.allFilterDesc')}
                </li>
                <li>
                  <strong>{t('admissionDashboard.waitingFilter')}</strong> -{' '}
                  {t('admissionDashboard.waitingFilterDesc')}
                </li>
                <li>
                  <strong>{t('admissionDashboard.inProgressFilter')}</strong> -{' '}
                  {t('admissionDashboard.inProgressFilterDesc')}
                </li>
              </ul>

              <h3>{t('admissionDashboard.workflowTitle')}</h3>
              <ol>
                <li>{t('admissionDashboard.workflowStartWork')}</li>
                <li>{t('admissionDashboard.workflowCallNext')}</li>
                <li>{t('admissionDashboard.workflowServeApplicant')}</li>
                <li>{t('admissionDashboard.workflowComplete')}</li>
                <li>{t('admissionDashboard.workflowRepeat')}</li>
              </ol>
              
              <p><strong>{t('admissionDashboard.pauseNote')}</strong> - {t('admissionDashboard.pauseNoteDesc')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdmissionDashboard;