import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import AuthForm from '../../components/AuthForm/AuthForm';
import { useTranslation } from 'react-i18next';
import './StaffLogin.css';

const StaffLogin = () => {
  const { t } = useTranslation();
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

  return (
    <div className="staff-login-page">
      <div className="auth-container">
        <h1>{t('login.staffTitle')}</h1>
        <p className="auth-description">{t('login.staffDescription')}</p>

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

export default StaffLogin;