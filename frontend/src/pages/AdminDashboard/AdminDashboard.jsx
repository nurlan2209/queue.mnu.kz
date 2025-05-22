import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AdminPanel from '../../components/AdminPanel/AdminPanel';
import EmployeesList from '../../components/EmployeesList/EmployeesList';
import QueueList from '../../components/QueueList/QueueList';
import VideoManager from '../../components/VideoManager/VideoManager';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('employees');

  return (
    <div className="admin-dashboard">
      <h1>{t('adminDashboard.title')}</h1>

      <div className="dashboard-tabs">
        <button 
          className={`tab-btn ${activeTab === 'employees' ? 'active' : ''}`}
          onClick={() => setActiveTab('employees')}
        >
          {t('adminDashboard.employeesTab')}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'queue' ? 'active' : ''}`}
          onClick={() => setActiveTab('queue')}
        >
          {t('adminDashboard.queueTab')}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'video' ? 'active' : ''}`}
          onClick={() => setActiveTab('video')}
        >
          Управление видео
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'employees' && <EmployeesList />}
        {activeTab === 'queue' && <QueueList />}
        {activeTab === 'video' && <VideoManager />}
      </div>
    </div>
  );
};

export default AdminDashboard;