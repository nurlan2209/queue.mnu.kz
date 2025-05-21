import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const createQueueEntry = async (data) => {
  const response = await api.post('/public/queue', data);
  return response.data;
};

export const getEmployees = async () => {
  try {
    const response = await api.get('/public/employees');
    return response.data;
  } catch (error) {
    console.error('Error loading employees:', error);
    // В случае ошибки возвращаем пустой массив вместо фиктивных данных
    return [];
  }
};

export const authAPI = {
  register: (userData) => api.post('/register', userData),
  login: (email, password) => 
    api.post('/login', new URLSearchParams({
      username: email,
      password,
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }),
};

export const queueAPI = {
  joinQueue: (data) => api.post('/public/queue', data),
  getStatus: () => api.get('/queue/status'),
  cancelQueue: () => api.delete('/queue/cancel'),
  checkQueueByName: (fullName) => api.get(`/public/queue/check?full_name=${encodeURIComponent(fullName)}`),
  cancelQueueById: (queueId) => api.delete(`/public/queue/cancel/${queueId}`),
  moveBackInQueue: (queueId) => api.put(`/public/queue/move-back/${queueId}`),
  getQueueCount: () => api.get('/public/queue/count'),
  getDisplayQueue: () => api.get('/public/display-queue'), // Добавленный метод
};

export const admissionAPI = {
  getQueue: (params = null) => api.get('/admission/queue', { params }),
  processNext: () => api.post('/admission/next'),
  updateEntry: (queueId, data) => api.put(`/admission/queue/${queueId}`, data),
  deleteEntry: (queueId) => api.delete(`/admission/queue/${queueId}`),
  // Методы для управления статусом
  startWork: () => api.post('/admission/start-work'),
  pauseWork: () => api.post('/admission/pause-work'),
  resumeWork: () => api.post('/admission/resume-work'),
  callNext: async () => {
    try {
      const response = await api.post('/admission/call-next');
      return response;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return {
          data: {
            message: "Нет абитуриентов в очереди для вас.",
            status: "empty_queue",
            success: false
          }
        };
      }
      throw error;
    }
  },
  completeCurrentApplicant: () => api.post('/admission/complete-current'),
  finishWork: () => api.post('/admission/finish-work'), 
  getStatus: () => api.get('/admission/status'),
};

export const adminAPI = {
  createAdmissionStaff: (userData) => api.post('/admin/create-admission', userData),
  getEmployees: () => api.get('/admin/employees'),
  updateEmployee: (employeeId, data) => api.put(`/admin/employees/${employeeId}`, data),
};



export default api;