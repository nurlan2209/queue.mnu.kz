import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthForm from '../../components/AuthForm/AuthForm';
import { useTranslation } from 'react-i18next';
import { FaChevronDown } from 'react-icons/fa';
import './Register.css';

const Register = () => {
  const { t, i18n } = useTranslation();
  const { register, login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleRegister = async (formData) => {
    try {
      setLoading(true);
      setError(null);

      await register(formData);

      await login(formData.email, formData.password);

      navigate('/applicant');
    } catch (err) {
      setError(err.response?.data?.detail || t('register.error'));
    } finally {
      setLoading(false);
    }
  };

  // Обработчик смены языка
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="register-page">
      <div className="auth-container">

        <h1>{t('register.title')}</h1>
        <p className="auth-description">{t('register.description')}</p>

        <AuthForm
          isLogin={false}
          onSubmit={handleRegister}
          loading={loading}
          error={error}
        />

        <div className="auth-footer">
          <p>
            {t('register.hasAccount')}{' '}
            <Link to="/login">{t('register.loginLink')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;