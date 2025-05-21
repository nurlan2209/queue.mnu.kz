import React, { useState, useEffect } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { createQueueEntry, getEmployees, queueAPI } from '../../api';
import QueueStatusCheck from '../../components/QueueStatusCheck/QueueStatusCheck';
import QueueTicket from '../../components/QueueTicket/QueueTicket';
import { useTranslation } from 'react-i18next';
import './PublicQueueForm.css';

const BACHELOR_PROGRAMS = [
  'accounting',
  'appliedLinguistics',
  'economicsDataScience',
  'finance',
  'hospitality',
  'internationalJournalism',
  'internationalLaw',
  'internationalRelations',
  'it',
  'jurisprudence',
  'management',
  'marketing',
  'psychology',
  'tourism',
  'translation',
];

const MASTER_PROGRAMS = [
  'politicalInternationalRelations',
  'appliedLinguistics',
  'competitionLaw',
  'consultingPsychology',
  'economics',
  'finance',
  'intellectualPropertyLaw',
  'internationalLaw',
  'itLaw',
  'jurisprudence',
  'translation',
];

const DOCTORATE_PROGRAMS = ['law', 'phdEconomics'];

const PublicQueueForm = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '+7', // Начинаем с +7
    programs: [],
    notes: '',
    assigned_employee_name: '',
    captcha_token: null,
  });
  const [employees, setEmployees] = useState([]);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [queueCount, setQueueCount] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [categoryStates, setCategoryStates] = useState({
    bachelor: false,
    master: false,
    doctorate: false,
  });

  const formatPhoneNumber = (value) => {
    // Удаляем все нецифровые символы, кроме первого + если он есть
    let digitsOnly = value.replace(/\D/g, '');
    
    // Добавляем 7 в начало, если его нет или номер начинается с 8
    if (!digitsOnly.startsWith('7')) {
      if (digitsOnly.startsWith('8')) {
        digitsOnly = '7' + digitsOnly.substring(1);
      } else {
        digitsOnly = '7' + digitsOnly;
      }
    }
    
    // Ограничиваем до 11 цифр
    digitsOnly = digitsOnly.substring(0, 11);
    
    // Форматируем строку с маской
    let formattedNumber = '+7';
    
    if (digitsOnly.length > 1) {
      // Добавляем код города/оператора
      const areaCode = digitsOnly.substring(1, Math.min(4, digitsOnly.length));
      formattedNumber += ' (' + areaCode;
      
      // Закрываем скобку после кода города, если код полный
      if (digitsOnly.length >= 4) {
        formattedNumber += ')';
        
        // Добавляем первую часть номера
        if (digitsOnly.length > 4) {
          formattedNumber += ' ' + digitsOnly.substring(4, Math.min(7, digitsOnly.length));
          
          // Добавляем первый дефис и следующие две цифры
          if (digitsOnly.length > 7) {
            formattedNumber += '-' + digitsOnly.substring(7, Math.min(9, digitsOnly.length));
            
            // Добавляем второй дефис и последние две цифры
            if (digitsOnly.length > 9) {
              formattedNumber += '-' + digitsOnly.substring(9, 11);
            }
          }
        }
      }
    }
    
    return formattedNumber;
  };

  const handlePhoneChange = (e) => {
    const formattedValue = formatPhoneNumber(e.target.value);
    setFormData({ ...formData, phone: formattedValue });
  };

  useEffect(() => {
    // Проверяем, есть ли талон в localStorage
    const savedTicket = localStorage.getItem('queueTicket');
    if (savedTicket) {
      try {
        const parsedTicket = JSON.parse(savedTicket);
        setTicket(parsedTicket);
        setSuccess(true);
      } catch (e) {
        localStorage.removeItem('queueTicket');
      }
    }

    // Загружаем список сотрудников
    getEmployees()
      .then((response) => setEmployees(response))
      .catch((err) => setError(t('publicQueueForm.employeeLoadError')));
    // Загружаем количество людей в очереди
    queueAPI.getQueueCount()
      .then((response) => setQueueCount(response.data.count))
      .catch(() => setQueueCount(null));
  }, []);

  const getEmployeeStatusText = (status) => {
    switch (status) {
      case 'available':
        return t('publicQueueForm.employeeStatus.available', 'Доступен');
      case 'busy':
        return t('publicQueueForm.employeeStatus.busy', 'Занят');
      case 'paused':
        return t('publicQueueForm.employeeStatus.paused', 'На перерыве');
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleProgramChange = (e) => {
    const { value, checked } = e.target;
    if (checked) {
      setFormData({
        ...formData,
        programs: [...formData.programs, value],
      });
    } else {
      setFormData({
        ...formData,
        programs: formData.programs.filter((program) => program !== value),
      });
    }
  };

  const handleCaptchaChange = (token) => {
    setCaptchaToken(token);
    setFormData({ ...formData, captcha_token: token });
  };

  const toggleCategory = (category) => {
    setCategoryStates({
      ...categoryStates,
      [category]: !categoryStates[category],
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!captchaToken) {
      setError(t('publicQueueForm.captchaError'));
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await createQueueEntry(formData);
      
      // После успешной отправки проверяем статус очереди по имени
      try {
        const queueStatus = await queueAPI.checkQueueByName(formData.full_name);
        const ticketData = {
          ...response,
          ...queueStatus.data,
          full_name: formData.full_name,
          phone: formData.phone,
          programs: formData.programs,
          assigned_employee_name: formData.assigned_employee_name
        };
        setTicket(ticketData);
        
        // Сохраняем талон в localStorage
        localStorage.setItem('queueTicket', JSON.stringify(ticketData));
      } catch (checkError) {
        console.error("Не удалось получить подробную информацию о талоне:", checkError);
      }
      
      setSuccess(true);
      setFormData({
        full_name: '',
        phone: '+7',
        programs: [],
        notes: '',
        assigned_employee_name: '',
        captcha_token: null,
      });
      setCaptchaToken(null);
      // Обновляем количество в очереди
      queueAPI.getQueueCount()
        .then((response) => setQueueCount(response.data.count))
        .catch(() => setQueueCount(null));
    } catch (err) {
      setError(err.response?.data?.detail || t('publicQueueForm.error'));
    } finally {
      setLoading(false);
    }
  };

  if (success && ticket) {
    return (
      <div className="public-form-container">
        <QueueTicket 
          ticket={ticket} 
          onReturn={() => {
            setSuccess(false);
            setTicket(null);
          }} 
        />
      </div>
    );
  } else if (success) {
    return (
      <div className="public-form-container">
        <div className="success-message">
          <h2>{t('publicQueueForm.successTitle')}</h2>
          <p>{t('publicQueueForm.successMessage')}</p>
          {queueCount !== null && (
            <p>
              {t('publicQueueForm.queuePosition')}{' '}
              <strong>{queueCount}</strong>
            </p>
          )}
          <button
            className="btn btn-primary"
            onClick={() => setSuccess(false)}
            style={{ marginTop: '1rem' }}
          >
            {t('publicQueueForm.backButton')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="public-form-container">
      <h1>{t('publicQueueForm.title')}</h1>
      <p className="form-description">{t('publicQueueForm.description')}</p>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit} className="public-queue-form">
        <div className="form-group">
          <label htmlFor="full_name">{t('publicQueueForm.fullNameLabel')}</label>
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
          <label htmlFor="phone">{t('publicQueueForm.phoneLabel')}</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handlePhoneChange}
            onFocus={(e) => {
              // При получении фокуса, если поле пустое, добавляем +7
              if (!e.target.value) {
                setFormData({ ...formData, phone: '+7' });
              }
              // Ставим курсор в конец
              const input = e.target;
              setTimeout(() => {
                input.selectionStart = input.selectionEnd = input.value.length;
              }, 0);
            }}
            placeholder="+7 (___) ___-__-__"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="assigned_employee_name">{t('publicQueueForm.employeeLabel')}</label>
          <select
            id="assigned_employee_name"
            name="assigned_employee_name"
            value={formData.assigned_employee_name}
            onChange={handleChange}
            required
          >
            <option value="">{t('publicQueueForm.selectEmployee')}</option>
            {employees.map((employee) => (
              <option key={employee.name} value={employee.name}>
                {employee.name} 
                {employee.desk ? ` (${t('publicQueueForm.desk', 'Стол')} ${employee.desk})` : ''}
                {employee.status && employee.status !== 'offline' ? ` - ${getEmployeeStatusText(employee.status)}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>{t('publicQueueForm.programsLabel')}</label>
          <div className="programs-list">
            <div className="category-header" onClick={() => toggleCategory('bachelor')}>
              <h3 className="program-category">{t('publicQueueForm.bachelor')}</h3>
              <span className={`toggle-icon ${categoryStates.bachelor ? 'expanded' : ''}`}>
                {categoryStates.bachelor ? '−' : '+'}
              </span>
            </div>
            {categoryStates.bachelor && (
              <div className="category-content">
                {BACHELOR_PROGRAMS.map((program) => (
                  <div className="program-item" key={program}>
                    <input
                      type="checkbox"
                      id={`program-${program}`}
                      value={program}
                      checked={formData.programs.includes(program)}
                      onChange={handleProgramChange}
                    />
                    <label htmlFor={`program-${program}`}>
                      {t(`publicQueueForm.programs.bachelor.${program}`)}
                    </label>
                  </div>
                ))}
              </div>
            )}
            <div className="category-header" onClick={() => toggleCategory('master')}>
              <h3 className="program-category">{t('publicQueueForm.master')}</h3>
              <span className={`toggle-icon ${categoryStates.master ? 'expanded' : ''}`}>
                {categoryStates.master ? '−' : '+'}
              </span>
            </div>
            {categoryStates.master && (
              <div className="category-content">
                {MASTER_PROGRAMS.map((program) => (
                  <div className="program-item" key={program}>
                    <input
                      type="checkbox"
                      id={`program-${program}`}
                      value={program}
                      checked={formData.programs.includes(program)}
                      onChange={handleProgramChange}
                    />
                    <label htmlFor={`program-${program}`}>
                      {t(`publicQueueForm.programs.master.${program}`)}
                    </label>
                  </div>
                ))}
              </div>
            )}
            <div className="category-header" onClick={() => toggleCategory('doctorate')}>
              <h3 className="program-category">{t('publicQueueForm.doctorate')}</h3>
              <span className={`toggle-icon ${categoryStates.doctorate ? 'expanded' : ''}`}>
                {categoryStates.doctorate ? '−' : '+'}
              </span>
            </div>
            {categoryStates.doctorate && (
              <div className="category-content">
                {DOCTORATE_PROGRAMS.map((program) => (
                  <div className="program-item" key={program}>
                    <input
                      type="checkbox"
                      id={`program-${program}`}
                      value={program}
                      checked={formData.programs.includes(program)}
                      onChange={handleProgramChange}
                    />
                    <label htmlFor={`program-${program}`}>
                      {t(`publicQueueForm.programs.doctorate.${program}`)}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="form-group captcha-container">
          <ReCAPTCHA
            sitekey="6LdkwT0rAAAAAAPWoQweToNny7P4FHheyz2SZIr8"
            onChange={handleCaptchaChange}
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary btn-submit"
          disabled={loading || !captchaToken}
        >
          {loading ? t('publicQueueForm.submitting') : t('publicQueueForm.submitButton')}
        </button>
      </form>
    </div>
  );
};

export default PublicQueueForm;