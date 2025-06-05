import React from 'react';
import { useTranslation } from 'react-i18next';
import ProgramTranslator from '../ProgramTranslator/ProgramTranslator';
import './QueueTicket.css';

const QueueTicket = ({ ticket, onReturn }) => {
  const { t } = useTranslation();

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

  return (
    <div className="queue-ticket">
      {/* Верхний блок с номером талона и консультанта */}
      <div className="ticket-highlight">
        <div className="ticket-column">
          <div className="label-inline">№ {t('queueTicket.title').toUpperCase()}</div>
          <div className="number">{ticket.queue_number}</div>
        </div>

        <div className="ticket-divider"></div>

        <div className="ticket-column">
          <div className="label-inline">КОНСУЛЬТАНТ</div>
          <div className="consultant-info">
            <div className="consultant-name">{ticket.assigned_employee_name}</div>
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
          <i className="fa-solid fa-user"></i> {ticket.full_name}
        </div>
        <div className="info-card">
          <i className="fa-solid fa-phone"></i> {ticket.phone}
        </div>
        <div className="info-card">
          <i className="fa-solid fa-graduation-cap"></i>{' '}
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
        <div className="info-card">
          <i className="fa-regular fa-clock"></i> {formatDate(ticket.created_at)}
        </div>
      </div>

      {/* Кнопки */}
      <div className="button-group">
        <button className="button-back" onClick={onReturn}>
          {t('queueTicket.backButton')}
        </button>
        <button
          className="button-close"
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