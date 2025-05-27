import React, { useState, useEffect } from 'react';
import { FaUser, FaPhoneAlt, FaStar, FaGraduationCap } from 'react-icons/fa';
import { useRecaptcha } from '../../hooks/useRecaptcha';
import { createQueueEntry, getEmployees, queueAPI } from '../../api';
import QueueTicket from '../../components/QueueTicket/QueueTicket';
import { useTranslation } from 'react-i18next';
import './PublicQueueForm.css';

const RECAPTCHA_SITE_KEY = "6LfOR0orAAAAAN7I_8_LpEJ0Ymu4ZDwPk5XZALN1";

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
  const { t, i18n } = useTranslation();
  const { isReady, isLoading, executeRecaptcha } = useRecaptcha(RECAPTCHA_SITE_KEY);
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '+7',
    program: '',
    notes: '',
    assigned_employee_name: '',
    captcha_token: null,
    form_language: i18n.language
  });
  const [employees, setEmployees] = useState([]);
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
      digitsOnly = '7' + digitsOnly.substring(digitsOnly.startsWith('8') ? 1 : 0);
    }
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
      } catch {
        localStorage.removeItem('queueTicket');
      }
    }
    getEmployees().then(setEmployees).catch(() => setError(t('publicQueueForm.employeeLoadError')));
    queueAPI.getQueueCount().then((res) => setQueueCount(res.data.count)).catch(() => setQueueCount(null));
  }, [t]);

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
    const { value } = e.target;
    setFormData({ ...formData, program: value });
    // Закрыть все категории после выбора
    setCategoryStates({
      bachelor: false,
      master: false,
      doctorate: false,
    });
  };

  const toggleCategory = (category) => {
    setCategoryStates({ ...categoryStates, [category]: !categoryStates[category] });
  };

  const getProgramCategory = (program) => {
    if (BACHELOR_PROGRAMS.includes(program)) return 'bachelor';
    if (MASTER_PROGRAMS.includes(program)) return 'master';
    if (DOCTORATE_PROGRAMS.includes(program)) return 'doctorate';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isReady) {
      setError('reCAPTCHA еще загружается. Попробуйте через несколько секунд.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      
      // Выполняем reCAPTCHA v3
      const captchaToken = await executeRecaptcha('submit_queue_form');
      
      if (!captchaToken) {
        setError('Не удалось пройти проверку reCAPTCHA.');
        setLoading(false);
        return;
      }

      // ИСПРАВЛЕНИЕ: Правильная структура данных для API
      const dataToSend = {
        full_name: formData.full_name,
        phone: formData.phone,
        programs: [formData.program], // Отправляем как массив
        notes: formData.notes || '',
        assigned_employee_name: formData.assigned_employee_name,
        captcha_token: captchaToken,
        form_language: i18n.language
      };

      
      const response = await createQueueEntry(dataToSend);
      
      // Создаем базовый талон из ответа сервера
      const basicTicketData = {
        ...response,
        full_name: formData.full_name,
        phone: formData.phone,
        programs: [formData.program],
        assigned_employee_name: formData.assigned_employee_name,
        form_language: i18n.language,
        created_at: new Date().toISOString()
      };

      console.log('🎫 Создаем базовый талон:', basicTicketData);
      
      // Пытаемся получить подробную информацию о заявке
      try {
        const queueStatus = await queueAPI.checkQueueByName(formData.full_name);
        
        const enhancedTicketData = {
          ...basicTicketData,
          ...queueStatus.data
        };
        
        setTicket(enhancedTicketData);
        localStorage.setItem('queueTicket', JSON.stringify(enhancedTicketData));
        
      } catch (checkError) {
        
        setTicket(basicTicketData);
        localStorage.setItem('queueTicket', JSON.stringify(basicTicketData));
      }
      
      setSuccess(true);
      setFormData({
        full_name: '',
        phone: '+7',
        program: '',
        notes: '',
        assigned_employee_name: '',
        captcha_token: null,
      });
      
      // Обновляем количество в очереди
      queueAPI.getQueueCount()
        .then((response) => {
          setQueueCount(response.data.count);
        })
        .catch((err) => {
          setQueueCount(null);
        });
        
    } catch (err) {
      console.error('❌ Ошибка отправки формы:', err);
      const errorMessage = err.response?.data?.detail || t('publicQueueForm.error');
      console.error('❌ Сообщение об ошибке:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderStatusBadge = (status) => {
    const statusMap = {
      available: { text: t('publicQueueForm.employeeStatus.available'), class: 'status-available1' },
      busy: { text: t('publicQueueForm.employeeStatus.busy'), class: 'status-busy1' },
      paused: { text: t('publicQueueForm.employeeStatus.paused'), class: 'status-paused1' },
    };
    const badge = statusMap[status];
    return badge ? <span className={`status-badge1 ${badge.class}`}>{badge.text}</span> : null;
  };

  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);

  if (success && ticket) {
    return (
      <div className="public-form-container">
        <QueueTicket 
          ticket={ticket} 
          onReturn={() => {
            setSuccess(false);
            setTicket(null);
            localStorage.removeItem('queueTicket');
          }} 
        />
      </div>
    );
  } else if (success && !ticket) {
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
            onClick={() => {
              setSuccess(false);
            }}
            style={{ marginTop: '1rem' }}
          >
            {t('publicQueueForm.backButton')}
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className={`public-form-container ${categoryStates.bachelor || categoryStates.master || categoryStates.doctorate ? 'modal-active' : ''}`}>
      <h1 className="form-title-main" style={{ color: '#1A2D6B' }}>{t('publicQueueForm.title')}</h1>
      <p className="form-description">{t('publicQueueForm.description')}</p>
      {error && <div className="alert alert-danger">{error}</div>}
      {isLoading && <p>Загрузка системы защиты...</p>}
      <form onSubmit={handleSubmit} className="public-queue-form">
        <div className="form-group">
          <div className="input-wrapper">
            <FaUser className="field-icon" />
            <input type="text" id="full_name" name="full_name" value={formData.full_name} onChange={handleChange} placeholder={t('publicQueueForm.fullNameLabel')} required />
          </div>
        </div>
        <div className="form-group">
          <div className="input-wrapper">
            <FaPhoneAlt className="field-icon" />
            <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handlePhoneChange} placeholder={t('publicQueueForm.phoneLabel')} required />
          </div>
        </div>
        <div className="form-group">
          <div className="employee-selector">
            <div className="employee-selector-header" onClick={() => setEmployeeDropdownOpen(!employeeDropdownOpen)}>
              <FaStar className="field-icon" />
              <span className="selected-employee">
                {formData.assigned_employee_name || t('publicQueueForm.selectEmployee')}
              </span>
              <span className={`dropdown-arrow ${employeeDropdownOpen ? 'open' : ''}`}>▼</span>
            </div>
            
            {employeeDropdownOpen && (
              <div className="employee-dropdown">
                {employees.map((emp) => (
                  <div 
                    key={emp.name} 
                    className="employee-option"
                    onClick={() => {
                      setFormData({ ...formData, assigned_employee_name: emp.name });
                      setEmployeeDropdownOpen(false);
                    }}
                  >
                    <div className="employee-info">
                      <span className="employee-name">{emp.name}</span>
                      {renderStatusBadge(emp.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="form-group">
          <label className="field-label">
            <FaGraduationCap className="field-icon" />
            {t('publicQueueForm.programsLabel')}
          </label>
          
          {/* Показать выбранную программу */}
          {formData.program && (
            <div className="selected-program">
              ✓ {t(`publicQueueForm.programs.${getProgramCategory(formData.program)}.${formData.program}`)}
            </div>
          )}
          
          <div className="programs-list">
            {['bachelor', 'master', 'doctorate'].map((cat) => (
              <React.Fragment key={cat}>
                <div className={`category-header ${cat}`} onClick={() => toggleCategory(cat)}>
                  <h3 className="program-category">{t(`publicQueueForm.${cat}`)}</h3>
                  <span className={`toggle-icon ${categoryStates[cat] ? 'expanded' : ''}`}>{categoryStates[cat] ? '−' : '+'}</span>
                </div>
                {categoryStates[cat] && (
                  <div className={`category-content ${cat}`}>
                    {(cat === 'bachelor' ? BACHELOR_PROGRAMS : cat === 'master' ? MASTER_PROGRAMS : DOCTORATE_PROGRAMS).map((program) => (
                      <div className="program-item" key={program}>
                        <input 
                          type="radio" 
                          id={`program-${program}`} 
                          name="program" 
                          value={program} 
                          checked={formData.program === program} 
                          onChange={handleProgramChange} 
                        />
                        <label htmlFor={`program-${program}`}>{t(`publicQueueForm.programs.${cat}.${program}`)}</label>
                      </div>
                    ))}
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="recaptcha-notice">
          <small>
            {t('publicQueueForm.recaptcha.notice')}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">{t('publicQueueForm.recaptcha.privacyPolicy')}</a>{' '}
            {t('publicQueueForm.recaptcha.and')}{' '}
            <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">{t('publicQueueForm.recaptcha.termsOfService')}</a>{' '}
            {t('publicQueueForm.recaptcha.google')}
          </small>
        </div>

        <button 
          type="submit" 
          className="btn btn-submit" 
          disabled={loading || !isReady}
        >
          {loading ? t('publicQueueForm.submitting') : t('publicQueueForm.submitButton')}
        </button>
      </form>
    </div>
  );
};

export default PublicQueueForm;
