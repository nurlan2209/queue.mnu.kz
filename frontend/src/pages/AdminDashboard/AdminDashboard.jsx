import React from 'react';
import AdminPanel from '../../components/AdminPanel/AdminPanel';
import { useTranslation } from 'react-i18next';
import { FaChevronDown } from 'react-icons/fa';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { t, i18n } = useTranslation();

  // Обработчик смены языка
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="admin-dashboard">
      <h1>{t('adminDashboard.title')}</h1>

      <div className="dashboard-content">
        <div className="admin-main">
          <AdminPanel />
        </div>

        <div className="sidebar">
          <div className="sidebar-section">
            <h2>{t('adminDashboard.instructionsTitle')}</h2>
            <div className="instruction-card">
              <h3>{t('adminDashboard.managementTitle')}</h3>
              <ul>
                <li>
                  <strong>{t('adminDashboard.createStaff')}</strong> -{' '}
                  {t('adminDashboard.createStaffDesc')}
                </li>
                <li>
                  <strong>{t('adminDashboard.fullName')}</strong> -{' '}
                  {t('adminDashboard.fullNameDesc')}
                </li>
                <li>
                  <strong>{t('adminDashboard.email')}</strong> -{' '}
                  {t('adminDashboard.emailDesc')}
                </li>
                <li>
                  <strong>{t('adminDashboard.phone')}</strong> -{' '}
                  {t('adminDashboard.phoneDesc')}
                </li>
                <li>
                  <strong>{t('adminDashboard.password')}</strong> -{' '}
                  {t('adminDashboard.passwordDesc')}
                </li>
              </ul>
            </div>
          </div>

          <div className="sidebar-section">
            <h2>{t('adminDashboard.noteTitle')}</h2>
            <div className="note-card">
              <p>{t('adminDashboard.noteAfterCreation')}</p>
              <p>{t('adminDashboard.staffCan')}</p>
              <ul>
                <li>{t('adminDashboard.staffCanView')}</li>
                <li>{t('adminDashboard.staffCanManage')}</li>
                <li>{t('adminDashboard.staffCanCall')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;