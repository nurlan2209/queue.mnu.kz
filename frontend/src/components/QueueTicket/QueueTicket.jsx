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
      minute: '2-digit'
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
      <div className="ticket-header">
        <h2>{t('queueTicket.title')}</h2>
        <div className="ticket-number">№ {ticket.queue_number}</div>
      </div>
      
      <div className="ticket-body">
        <div className="ticket-info">
          <div className="info-row">
            <span className="info-label">{t('queueTicket.fullName')}:</span>
            <span className="info-value">{ticket.full_name}</span>
          </div>
          
          <div className="info-row">
            <span className="info-label">{t('queueTicket.phone')}:</span>
            <span className="info-value">{ticket.phone}</span>
          </div>
          
          <div className="info-row">
            <span className="info-label">{t('queueTicket.programs')}:</span>
            <span className="info-value">
              {Array.isArray(ticket.programs) ? (
                ticket.programs.map((program, index) => (
                  <React.Fragment key={program}>
                    <ProgramTranslator programCode={program} formLanguage={ticket.form_language} />
                    {index < ticket.programs.length - 1 && ', '}
                  </React.Fragment>
                ))
              ) : (
                // Если programs не массив, пробуем обработать как строку
                typeof ticket.programs === 'string' ? 
                  <ProgramTranslator programCode={ticket.programs} formLanguage={ticket.form_language} /> :
                  ticket.programs || '-'
              )}
            </span>
          </div>
          
          <div className="info-row">
            <span className="info-label">{t('queueTicket.queue')}:</span>
            <span className="info-value">{ticket.position || 0}</span>
          </div>
          
          <div className="info-row">
            <span className="info-label">{t('queueTicket.peopleAhead')}:</span>
            <span className="info-value">{ticket.people_ahead || 0}</span>
          </div>
          
          <div className="info-row">
            <span className="info-label">{t('queueTicket.createdAt')}:</span>
            <span className="info-value">{formatDate(ticket.created_at)}</span>
          </div>
          
          <div className="info-row">
            <span className="info-label">{t('queueTicket.employee')}:</span>
            <span className="info-value">{ticket.assigned_employee_name}</span>
          </div>
        </div>
      </div>
      
      <div className="ticket-actions">
        <button className="btn btn-primary" onClick={onReturn}>
          {t('queueTicket.backButton')}
        </button>
        <button className="btn btn-danger" onClick={() => {
          localStorage.removeItem('queueTicket');
          onReturn();
        }}>
          {t('queueTicket.closeTicket')}
        </button>
      </div>
    </div>
  );
};

export default QueueTicket;