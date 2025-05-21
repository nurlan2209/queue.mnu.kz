// EmployeesList.jsx
import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import { useTranslation } from 'react-i18next';
import './EmployeesList.css';

const EmployeesList = () => {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newEmployee, setNewEmployee] = useState({
    email: '',
    full_name: '',
    phone: '',
    password: '',
    desk: '',
  });

  // Загрузка сотрудников
    const loadEmployees = async () => {
    try {
        setLoading(true);
        const response = await adminAPI.getEmployees();
        // Проверить, является ли response массивом
        setEmployees(Array.isArray(response) ? response : []);
    } catch (err) {
        setError(err.response?.data?.detail || t('employeesList.loadError'));
        // Установить пустой массив в случае ошибки
        setEmployees([]);
    } finally {
        setLoading(false);
    }
    };

  useEffect(() => {
    loadEmployees();
  }, []);

  // Обработчик изменения полей нового сотрудника
  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewEmployee({ ...newEmployee, [name]: value });
  };

  // Добавление нового сотрудника
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createAdmissionStaff(newEmployee);
      setNewEmployee({
        email: '',
        full_name: '',
        phone: '',
        password: '',
        desk: '',
      });
      loadEmployees(); // Перезагрузить список
    } catch (err) {
      setError(err.response?.data?.detail || t('employeesList.addError'));
    }
  };

  // Удаление сотрудника
  const handleDeleteEmployee = async (id) => {
    if (window.confirm(t('employeesList.confirmDelete'))) {
      try {
        await adminAPI.deleteEmployee(id);
        loadEmployees(); // Перезагрузить список
      } catch (err) {
        setError(err.response?.data?.detail || t('employeesList.deleteError'));
      }
    }
  };

  // Функция для перевода статуса сотрудника
  const getTranslatedStatus = (status) => {
    if (!status) return t('employeeStatus.offline');
    
    switch (status) {
      case 'available':
        return t('employeeStatus.available');
      case 'busy':
        return t('employeeStatus.busy');
      case 'paused':
        return t('employeeStatus.paused');
      case 'offline':
        return t('employeeStatus.offline');
      default:
        return t('employeeStatus.unknown');
    }
  };

  return (
    <div className="employees-list-container">
      <h2>{t('employeesList.title')}</h2>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      {/* Форма добавления сотрудника */}
      <form onSubmit={handleAddEmployee} className="add-employee-form">
        <h3>{t('employeesList.addEmployee')}</h3>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="full_name">{t('employeesList.fullNameLabel')}</label>
            <input
              type="text"
              id="full_name"
              name="full_name"
              value={newEmployee.full_name}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">{t('employeesList.emailLabel')}</label>
            <input
              type="email"
              id="email"
              name="email"
              value={newEmployee.email}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="phone">{t('employeesList.phoneLabel')}</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={newEmployee.phone}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="desk">{t('employeesList.deskLabel')}</label>
            <input
              type="text"
              id="desk"
              name="desk"
              value={newEmployee.desk}
              onChange={handleChange}
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="password">{t('employeesList.passwordLabel')}</label>
            <input
              type="password"
              id="password"
              name="password"
              value={newEmployee.password}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        
        <button type="submit" className="btn btn-primary">
          {t('employeesList.addButton')}
        </button>
      </form>
      
      {/* Таблица сотрудников */}
      <div className="employees-table">
        <h3>{t('employeesList.tableTitle')}</h3>
        {loading ? (
          <p>{t('employeesList.loading')}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t('employeesList.fullName')}</th>
                <th>{t('employeesList.email')}</th>
                <th>{t('employeesList.phone')}</th>
                <th>{t('employeesList.desk')}</th>
                <th>{t('employeesList.status')}</th>
                <th>{t('employeesList.actions')}</th>
              </tr>
            </thead>
            <tbody>
                {employees && Array.isArray(employees) && employees.length === 0 ? (
                <tr>
                    <td colSpan="6">{t('employeesList.noEmployees')}</td>
                </tr>
                ) : (
                employees && Array.isArray(employees) && employees.map((employee) => (
                    <tr key={employee.id}>
                    <td>{employee.full_name}</td>
                    <td>{employee.email}</td>
                    <td>{employee.phone}</td>
                    <td>{employee.desk || '-'}</td>
                    <td>{getTranslatedStatus(employee.status)}</td>
                    <td>
                        <button
                        className="btn btn-danger"
                        onClick={() => handleDeleteEmployee(employee.id)}
                        >
                        {t('employeesList.deleteButton')}
                        </button>
                    </td>
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

export default EmployeesList;