import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import './DeskManager.css';
import { useTranslation } from 'react-i18next';

const DeskManager = () => {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [deskName, setDeskName] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getEmployees();
      setEmployees(response.data);
      setError(null);
    } catch (err) {
      setError(t('deskManager.loadError'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (employee) => {
    setEditingEmployeeId(employee.id);
    setDeskName(employee.desk || '');
  };

  const handleSaveDesk = async (employeeId) => {
    try {
      setLoading(true);
      await adminAPI.updateEmployee(employeeId, { desk: deskName });
      setEditingEmployeeId(null);
      fetchEmployees(); // Обновляем список после сохранения
    } catch (err) {
      setError(t('deskManager.updateError'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingEmployeeId(null);
    setDeskName('');
  };

  if (loading && employees.length === 0) {
    return <div className="desk-manager-loading">{t('deskManager.loading')}</div>;
  }

  return (
    <div className="desk-manager">
      <h2>{t('deskManager.title')}</h2>
      {error && <div className="desk-manager-error">{error}</div>}
      
      <div className="desk-list">
        {employees.length === 0 ? (
          <div className="no-employees">{t('deskManager.noEmployees')}</div>
        ) : (
          employees.map(employee => (
            <div className="desk-item" key={employee.id}>
              <div className="employee-info">
                <h3>{employee.full_name}</h3>
                <p>Email: {employee.email}</p>
              </div>
              
              {editingEmployeeId === employee.id ? (
                <div className="desk-edit">
                  <input
                    type="text"
                    value={deskName}
                    onChange={(e) => setDeskName(e.target.value)}
                    placeholder={t('deskManager.deskPlaceholder')}
                  />
                  <div className="desk-edit-actions">
                    <button 
                      onClick={() => handleSaveDesk(employee.id)}
                      className="btn btn-primary"
                    >
                      {t('deskManager.saveButton')}
                    </button>
                    <button 
                      onClick={handleCancelEdit}
                      className="btn btn-secondary"
                    >
                      {t('deskManager.cancelButton')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="desk-display">
                  <span>{t('deskManager.deskLabel')}: {employee.desk || t('deskManager.noDesk')}</span>
                  <button 
                    onClick={() => handleStartEdit(employee)}
                    className="btn btn-primary"
                  >
                    {t('deskManager.editButton')}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DeskManager;