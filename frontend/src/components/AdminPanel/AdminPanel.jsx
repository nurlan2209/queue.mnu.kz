import React, { useState } from 'react';
import { adminAPI } from '../../api';
import { useTranslation } from 'react-i18next';
import { FaChevronDown } from 'react-icons/fa';
import './AdminPanel.css';

const AdminPanel = () => {
  const { t, i18n } = useTranslation();
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    phone: '',
    password: '',
    desk: '', // Добавляем поле стола
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      await adminAPI.createAdmissionStaff(formData);

      setSuccess(t('adminPanel.success'));
      setFormData({
        email: '',
        full_name: '',
        phone: '',
        password: '',
        desk: '', // Сбрасываем поле стола
      });
    } catch (err) {
      setError(err.response?.data?.detail || t('adminPanel.error'));
    } finally {
      setLoading(false);
    }
  };

  // Обработчик смены языка
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="admin-panel">

      <h2>{t('adminPanel.title')}</h2>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit} className="admin-form">
        <div className="form-group">
          <label htmlFor="full_name">{t('adminPanel.fullNameLabel')}</label>
          <input
            type="text"
            id="full_name"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">{t('adminPanel.emailLabel')}</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="phone">{t('adminPanel.phoneLabel')}</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="desk">{t('adminPanel.deskLabel')}</label>
          <input
            type="text"
            id="desk"
            name="desk"
            value={formData.desk}
            onChange={handleChange}
            placeholder={t('adminPanel.deskPlaceholder')}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">{t('adminPanel.passwordLabel')}</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? t('adminPanel.creating') : t('adminPanel.createButton')}
        </button>
      </form>
    </div>
  );
};

export default AdminPanel;