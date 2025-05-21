import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthForm from '../../components/AuthForm/AuthForm';
import { useTranslation } from 'react-i18next';
import { FaChevronDown } from 'react-icons/fa';
import './Login.css';

const Login = () => {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (formData) => {
    try {
      setLoading(true);
      setError(null);
      await login(formData.email, formData.password);
    } catch (err) {
      setError(t('login.error'));
    } finally {
      setLoading(false);
    }
  };

  // Обработчик смены языка
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="login-page">
      <div className="auth-container">

        <h1>{t('login.title')}</h1>
        <p className="auth-description">{t('login.description')}</p>

        <AuthForm
          isLogin={true}
          onSubmit={handleLogin}
          loading={loading}
          error={error}
        />
      </div>
    </div>
  );
};

export default Login;