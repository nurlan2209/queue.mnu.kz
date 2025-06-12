// QueueTicket.jsx - Обновленная версия с цветовой схемой

import React from 'react';
import { useTranslation } from 'react-i18next';
import ProgramTranslator from '../ProgramTranslator/ProgramTranslator';
import { getProgramCategoryFromArray, getProgramColors, getProgramCSSClasses } from '../../utils/programColors';
import { FaUser, FaPhoneAlt, FaGraduationCap, FaClock } from 'react-icons/fa'; 
import './QueueTicket.css';

const QueueTicket = ({ ticket, onReturn }) => {
  const { t } = useTranslation();

  // Получаем категорию и цвета программы
  const programCategory = getProgramCategoryFromArray(ticket.programs);
  const programColors = getProgramColors(ticket.programs);
  const cssClasses = getProgramCSSClasses(ticket.programs);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatPrograms = (programs) => {
    if (!programs || programs.length === 0) return '-';
    
    return programs.map(program => {
      // Попытка найти перевод для программы
      const key = `publicQueueForm.programs.bachelor.${program}`;
      const translation = t(key);
      
      // Если перевод совпадает с ключом, значит перевода нет, пробуем другие категории
      if (translation === key) {
        const masterKey = `publicQueueForm.programs.master.${program}`;
        const masterTranslation = t(masterKey);
        
        if (masterTranslation !== masterKey) {
          return masterTranslation;
        }
        
        const doctorateKey = `publicQueueForm.programs.doctorate.${program}`;
        const doctorateTranslation = t(doctorateKey);
        
        if (doctorateTranslation !== doctorateKey) {
          return doctorateTranslation;
        }
        
        // Если все попытки не удались, возвращаем оригинальное название программы
        return program;
      }
      
      return translation;
    }).join(', ');
  };

  // Стили для верхнего блока на основе категории программы
  const ticketHighlightStyle = {
    backgroundColor: programColors.background,
    border: `2px solid ${programColors.border}`,
    color: programColors.text
  };

  // Стили для разделителя
  const dividerStyle = {
    backgroundColor: programColors.text
  };

  return (
    <div className="queue-ticket">
      {/* Верхний блок с номером талона и консультанта - ЦВЕТНОЙ */}
      <div 
        className={`ticket-highlight program-colored ${programCategory}`}
        style={ticketHighlightStyle}
      >
        <div className="ticket-column">
          <div className="label-inline" style={{ color: programColors.text }}>
            № {t('queueTicket.title').toUpperCase()}
          </div>
          <div className="number" style={{ color: programColors.text }}>
            {ticket.queue_number}
          </div>
          {/* Добавляем бейдж с типом программы */}
          <div className={`program-badge ${programCategory}`}>
            {programColors.label}
          </div>
        </div>

        <div 
          className="ticket-divider" 
          style={dividerStyle}
        ></div>

        <div className="ticket-column">
          <div className="label-inline" style={{ color: programColors.text }}>
            КОНСУЛЬТАНТ
          </div>
          <div className="consultant-info">
            <div 
              className="consultant-name" 
              style={{ color: programColors.text }}
            >
              {ticket.assigned_employee_name}
            </div>
          </div>
        </div>
      </div>

      {/* Людей впереди */}
      <div className="queue-position">
        {t('queueTicket.peopleAhead')}: {ticket.people_ahead || 0}
      </div>

      {/* Информация */}
      <div className="ticket-info">
        <div className="info-card">
          <FaUser className="field-icon" /> {ticket.full_name}
        </div>
        <div className="info-card">
          <FaPhoneAlt className="field-icon" /> {ticket.phone}
        </div>
        
        {/* Карточка с программой - тоже цветная */}
        <div 
          className={`info-card program-card ${programCategory}`}
          style={{
            backgroundColor: `${programColors.background}40`, // 25% прозрачности
            borderColor: programColors.border,
            color: programColors.text
          }}
        >
          <FaGraduationCap className="field-icon" />{' '}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className={`program-indicator ${programCategory}`}></span>
            {Array.isArray(ticket.programs) ? (
              ticket.programs.map((program, index) => (
                <React.Fragment key={program}>
                  <ProgramTranslator programCode={program} formLanguage={ticket.form_language} />
                  {index < ticket.programs.length - 1 && ', '}
                </React.Fragment>
              ))
            ) : typeof ticket.programs === 'string' ? (
              <ProgramTranslator programCode={ticket.programs} formLanguage={ticket.form_language} />
            ) : (
              ticket.programs || '-'
            )}
          </div>
        </div>
        
        <div className="info-card">
          <FaClock className="field-icon" /> {formatDate(ticket.created_at)}
        </div>
      </div>

      {/* Кнопки с акцентным цветом */}
      <div className="button-group">
        <button className="button-back" onClick={onReturn}>
          {t('queueTicket.backButton')}
        </button>
        <button
          className="button-close"
          style={{ 
            backgroundColor: programColors.text,
            borderColor: programColors.text
          }}
          onClick={() => {
            localStorage.removeItem('queueTicket');
            onReturn();
          }}
        >
          {t('queueTicket.closeTicket')}
        </button>
      </div>
    </div>
  );
};

export default QueueTicket;