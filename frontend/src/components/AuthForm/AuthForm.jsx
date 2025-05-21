import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaChevronDown } from 'react-icons/fa';
import './AuthForm.css';

const AuthForm = ({ isLogin, onSubmit, loading, error }) => {
  const { t, i18n } = useTranslation();
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    phone: '',
    password: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // Обработчик смены языка
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="auth-form-container">

      <form onSubmit={handleSubmit} className="auth-form">
        {error && <div className="alert alert-danger">{error}</div>}

        {!isLogin && (
          <>
            <div className="form-group">
              <label htmlFor="full_name">{t('authForm.fullNameLabel')}</label>
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
              <label htmlFor="phone">{t('authForm.phoneLabel')}</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>
          </>
        )}

        <div className="form-group">
          <label htmlFor="email">{t('authForm.emailLabel')}</label>
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
          <label htmlFor="password">{t('authForm.passwordLabel')}</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? t('authForm.loading') : isLogin ? t('authForm.loginButton') : t('authForm.registerButton')}
        </button>
      </form>
    </div>
  );
};

export default AuthForm;