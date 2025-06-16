import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import { useTranslation } from 'react-i18next';
import ProgramTranslator from '../ProgramTranslator/ProgramTranslator';
import './QueueList.css';

const QueueList = () => {
  const { t } = useTranslation();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  
  // Состояния для Google Sheets
  const [showGoogleSheetsModal, setShowGoogleSheetsModal] = useState(false);
  const [googleSheetsId, setGoogleSheetsId] = useState('');
  const [savedGoogleSheetsId, setSavedGoogleSheetsId] = useState('');
  const [isEditingId, setIsEditingId] = useState(false);
  
  const [filters, setFilters] = useState({
    status: '',
    date: '',
    employee: '',
    full_name: '',  
    program: '' 
  });

  // Загрузка сохраненного Google Sheets ID при загрузке компонента
  useEffect(() => {
    const savedId = localStorage.getItem('googleSheetsId');
    if (savedId) {
      setSavedGoogleSheetsId(savedId);
    }
  }, []);

  // Загрузка заявок
  const loadQueue = async () => {
    try {
        setLoading(true);
        const params = {};
        if (filters.status) params.status = filters.status;
        if (filters.date) params.date = filters.date;
        if (filters.employee) params.employee = filters.employee;
        if (filters.full_name) params.full_name = filters.full_name;  
        if (filters.program) params.program = filters.program;      
        
        const response = await adminAPI.getAllQueue(params);
        setQueue(Array.isArray(response) ? response : []);
    } catch (err) {
        setError(err.response?.data?.detail || t('queueList.loadError'));
        setQueue([]);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [filters]);

  // Обработчик изменения фильтров
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
  };

  // Экспорт в Excel/CSV
  const handleExportToExcel = async () => {
    try {
      setExportLoading(true);
      const response = await adminAPI.exportQueueToExcel();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'queue_data.xlsx'); 
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError(err.response?.data?.detail || t('queueList.exportError'));
    } finally {
      setExportLoading(false);
    }
  };

  // Открытие модального окна для настройки Google Sheets
  const handleOpenGoogleSheetsModal = () => {
    setGoogleSheetsId(savedGoogleSheetsId);
    setShowGoogleSheetsModal(true);
    setIsEditingId(!savedGoogleSheetsId); // Если ID не сохранен, сразу включаем режим редактирования
  };

  // Сохранение Google Sheets ID
  const handleSaveGoogleSheetsId = () => {
    if (googleSheetsId.trim()) {
      localStorage.setItem('googleSheetsId', googleSheetsId.trim());
      setSavedGoogleSheetsId(googleSheetsId.trim());
      setIsEditingId(false);
      alert('Google Sheets ID успешно сохранен!');
    } else {
      alert('Пожалуйста, введите действительный Google Sheets ID');
    }
  };

  // Подготовка данных для копирования
  const prepareDataForCopy = () => {
    const headers = ['ФИО', 'Программы', 'Номер в очереди', 'Сотрудник', 'Дата создания', 'Статус', 'Время обработки (сек)'];
    
    const rows = queue.map(entry => [
      entry.full_name || '-',
      Array.isArray(entry.programs) ? entry.programs.join(', ') : (entry.programs || '-'),
      entry.queue_number || '-',
      entry.assigned_employee_name || '-',
      entry.created_at ? formatDateTime(entry.created_at) : '-',
      getTranslatedStatus(entry.status),
      entry.processing_time ? formatTime(entry.processing_time) : '-'
    ]);

    return [headers, ...rows];
  };

  // Копирование данных в буфер обмена
  const copyDataToClipboard = async () => {
    try {
      const data = prepareDataForCopy();
      const textData = data.map(row => row.join('\t')).join('\n');
      
      await navigator.clipboard.writeText(textData);
      return true;
    } catch (err) {
      console.error('Ошибка копирования:', err);
      return false;
    }
  };

  // Переход к Google Sheets с копированием данных
  const handleExportToGoogleSheets = async () => {
    if (savedGoogleSheetsId) {
      // Копируем данные в буфер обмена
      const copied = await copyDataToClipboard();
      
      if (copied) {
        alert('✅ Данные скопированы в буфер обмена!\n\nИнструкция:\n1. Таблица откроется в новой вкладке\n2. Выберите ячейку A1\n3. Нажмите Ctrl+V (или Cmd+V на Mac)\n4. Данные автоматически вставятся в таблицу');
      } else {
        alert('⚠️ Не удалось скопировать данные в буфер обмена.\nВы можете вручную скопировать данные из таблицы ниже.');
      }
      
      // Открываем Google Sheets
      const googleSheetsUrl = `https://docs.google.com/spreadsheets/d/${savedGoogleSheetsId}/edit#gid=0`;
      window.open(googleSheetsUrl, '_blank');
      setShowGoogleSheetsModal(false);
    } else {
      alert('Сначала настройте Google Sheets ID');
    }
  };

  // Закрытие модального окна
  const handleCloseModal = () => {
    setShowGoogleSheetsModal(false);
    setGoogleSheetsId(savedGoogleSheetsId);
    setIsEditingId(false);
  };

  // Включение режима редактирования ID
  const handleEditId = () => {
    setIsEditingId(true);
    setGoogleSheetsId(savedGoogleSheetsId);
  };

  // Форматирование времени (из секунд в часы, минуты, секунды)
  const formatTime = (seconds) => {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    let result = '';
    if (hours > 0) result += `${hours}ч `;
    if (minutes > 0) result += `${minutes}м `;
    result += `${remainingSeconds}с`;
    return result;
  };

  // Форматирование даты и времени
  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '-';
    const date = new Date(dateTimeStr);
    return date.toLocaleString();
  };

  // Получение переведенного статуса заявки
  const getTranslatedStatus = (status) => {
    if (!status) return t('admissionQueue.status.unknown');
    
    switch (status) {
      case 'waiting':
        return t('admissionQueue.status.waiting');
      case 'in_progress':
        return t('admissionQueue.status.in_progress');
      case 'completed':
        return t('admissionQueue.status.completed');
      case 'paused':
        return t('admissionQueue.status.paused');
      case 'cancelled':
        return t('admissionQueue.status.cancelled');
      default:
        return t('admissionQueue.status.unknown');
    }
  };

  return (
    <div className="queue-list-container">
      <h2>{t('queueList.title')}</h2>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      {/* Фильтры */}
      <div className="filters-container">
        <div className="filter-group">
          <label htmlFor="status">{t('queueList.statusFilter')}</label>
          <select
            id="status"
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
          >
            <option value="">{t('queueList.allStatuses')}</option>
            <option value="waiting">{t('queueList.waiting')}</option>
            <option value="in_progress">{t('queueList.inProgress')}</option>
            <option value="completed">{t('queueList.completed')}</option>
            <option value="paused">{t('queueList.paused')}</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="date">{t('queueList.dateFilter')}</label>
          <input
            type="date"
            id="date"
            name="date"
            value={filters.date}
            onChange={handleFilterChange}
          />
        </div>
        
        <div className="filter-group">
          <label htmlFor="employee">{t('queueList.employeeFilter')}</label>
          <input
            type="text"
            id="employee"
            name="employee"
            placeholder={t('queueList.employeePlaceholder')}
            value={filters.employee}
            onChange={handleFilterChange}
          />
        </div>

        <div className="filter-group">
          <label htmlFor="full_name">Фильтр по ФИО</label>
          <input
            type="text"
            id="full_name"
            name="full_name"
            placeholder="Введите ФИО абитуриента"
            value={filters.full_name}
            onChange={handleFilterChange}
          />
        </div>

        <div className="filter-group">
          <label htmlFor="program">Фильтр по программе</label>
          <input
            type="text"
            id="program"
            name="program"
            placeholder="Введите название программы"
            value={filters.program}
            onChange={handleFilterChange}
          />
        </div>
        
        {/* Кнопки экспорта */}
        <div className="export-buttons">
          <button 
            className="btn btn-primary export-btn" 
            onClick={handleExportToExcel}
            disabled={exportLoading}
          >
            {exportLoading ? 'Экспорт...' : t('queueList.exportButton')}
          </button>
        </div>
      </div>

      {/* Модальное окно Google Sheets */}
      {showGoogleSheetsModal && (
        <div className="modal-overlay">
          <div className="modal-content google-sheets-modal">
            <div className="modal-header">
              <h3>Настройка Google Sheets</h3>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>
            
            <div className="modal-body">
              {!savedGoogleSheetsId || isEditingId ? (
                <div className="sheets-id-input">
                  <label htmlFor="sheetsId">Google Sheets ID:</label>
                  <input
                    type="text"
                    id="sheetsId"
                    value={googleSheetsId}
                    onChange={(e) => setGoogleSheetsId(e.target.value)}
                    placeholder="Введите ID Google Sheets таблицы"
                    className="sheets-input"
                  />
                  <button 
                    onClick={handleSaveGoogleSheetsId}
                    className="btn btn-primary save-btn"
                  >
                    Сохранить
                  </button>
                </div>
              ) : (
                <div className="sheets-id-display">
                  <p><strong>Текущий Google Sheets ID:</strong></p>
                  <div className="saved-id-container">
                    <code className="saved-id">{savedGoogleSheetsId}</code>
                    <button 
                      onClick={handleEditId}
                      className="btn btn-secondary edit-btn"
                    >
                      Изменить
                    </button>
                  </div>
                </div>
              )}

              {savedGoogleSheetsId && !isEditingId && (
                <div className="export-actions">
                  <button 
                    onClick={handleExportToGoogleSheets}
                    className="btn btn-success export-to-sheets-btn"
                  >
                    🚀 Скопировать данные и перейти к Google Sheets
                  </button>
                  
                  <button 
                    onClick={async () => {
                      const copied = await copyDataToClipboard();
                      if (copied) {
                        alert('✅ Данные скопированы в буфер обмена!\nТеперь вы можете вставить их в любую таблицу с помощью Ctrl+V');
                      } else {
                        alert('❌ Ошибка копирования данных');
                      }
                    }}
                    className="btn btn-secondary copy-data-btn"
                  >
                    📋 Только скопировать данные
                  </button>
                </div>
              )}

              <div className="instructions">
                <h4>📋 Инструкция:</h4>
                
                <div className="instruction-section">
                  <h5>🔧 Настройка Google Sheets:</h5>
                  <ol>
                    <li>Откройте <a href="https://sheets.google.com" target="_blank" rel="noopener noreferrer">Google Sheets</a> и создайте новую таблицу</li>
                    <li>Скопируйте ID таблицы из URL адреса:</li>
                    <li className="url-example">
                      <code>https://docs.google.com/spreadsheets/d/<span className="highlight">1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms</span>/edit</code>
                    </li>
                    <li>Вставьте выделенную часть (ID) в поле выше</li>
                    <li>Убедитесь, что таблица доступна для редактирования</li>
                  </ol>
                </div>

                <div className="instruction-section">
                  <h5>📊 Экспорт данных:</h5>
                  <ol>
                    <li>Нажмите "Скопировать данные и перейти к Google Sheets"</li>
                    <li>Данные автоматически скопируются в буфер обмена</li>
                    <li>Google Sheets откроется в новой вкладке</li>
                    <li>Выберите ячейку <strong>A1</strong> в таблице</li>
                    <li>Нажмите <kbd>Ctrl+V</kbd> (или <kbd>Cmd+V</kbd> на Mac)</li>
                    <li>Данные автоматически вставятся с правильным форматированием!</li>
                  </ol>
                </div>
                
                <div className="tip">
                  <strong>💡 Совет:</strong> Данные копируются в табличном формате и автоматически разделятся по столбцам при вставке в Google Sheets. Вы также можете использовать кнопку "Только скопировать данные" для копирования без открытия браузера.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Таблица заявок */}
      <div className="queue-table">
        {loading ? (
          <p>{t('queueList.loading')}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t('queueList.fullName')}</th>
                <th>{t('queueList.programs')}</th>
                <th>{t('queueList.queueNumber')}</th>
                <th>{t('queueList.employee')}</th>
                <th>{t('queueList.dateCreated')}</th>
                <th>{t('queueList.status')}</th>
                <th>{t('queueList.processingTime')}</th>
              </tr>
            </thead>
            <tbody>
                {queue && Array.isArray(queue) && queue.length === 0 ? (
                <tr>
                    <td colSpan="7">{t('queueList.noEntries')}</td>
                </tr>
                ) : (
                queue && Array.isArray(queue) && queue.map((entry) => (
                    <tr key={entry.id}>
                    <td>{entry.full_name}</td>
                    <td>
                        {Array.isArray(entry.programs) ? 
                        entry.programs.map((program, index) => (
                            <React.Fragment key={program}>
                            <ProgramTranslator programCode={program} formLanguage={entry.form_language} />
                            {index < entry.programs.length - 1 && ', '}
                            </React.Fragment>
                        )) : 
                        entry.programs
                        }
                    </td>
                    <td>{entry.queue_number}</td>
                    <td>{entry.assigned_employee_name || '-'}</td>
                    <td>{formatDateTime(entry.created_at)}</td>
                    <td>{getTranslatedStatus(entry.status)}</td>
                    <td>{formatTime(entry.processing_time)}</td>
                    </tr>
                ))
                )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default QueueList;