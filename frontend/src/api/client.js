import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Attach token to every request
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// Redirect to login on 401
api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      const hadToken = !!localStorage.getItem('token')
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = hadToken ? '/login?reason=expired' : '/login'
    }
    return Promise.reject(err)
  }
)

export const authApi = {
  login:          (username, password) => {
    const form = new URLSearchParams()
    form.append('username', username)
    form.append('password', password)
    return api.post('/auth/login', form).then(r => r.data)
  },
  me:             ()     => api.get('/auth/me').then(r => r.data),
  microsoftLogin: (idToken) => api.post('/auth/microsoft', { id_token: idToken }).then(r => r.data),
  updateMe:       (data) => api.patch('/auth/me', data).then(r => r.data),
  changePassword: (data) => api.post('/auth/me/password', data).then(r => r.data),
  listUsers:      ()     => api.get('/auth/users').then(r => r.data),
  createUser:     (data) => api.post('/auth/users', data).then(r => r.data),
  updateUser:     (id, data) => api.patch(`/auth/users/${id}`, data).then(r => r.data),
  resetPassword:  (id, password) => api.post(`/auth/users/${id}/reset-password`, { password }).then(r => r.data),
  deactivateUser: (id)   => api.delete(`/auth/users/${id}`).then(r => r.data),
}

export const plans = {
  list:        (status) => api.get('/plans/', { params: status ? { status } : {} }).then(r => r.data),
  get:         (id)     => api.get(`/plans/${id}`).then(r => r.data),
  create:      (data)   => api.post('/plans/', data).then(r => r.data),
  update:      (id, data) => api.patch(`/plans/${id}`, data).then(r => r.data),
  delete:      (id)     => api.delete(`/plans/${id}`).then(r => r.data),
  performance: (params) => api.get('/plans/performance', { params }).then(r => r.data),
  activity:    (id)     => api.get(`/plans/${id}/activity`).then(r => r.data),
}

export const equipment = {
  manufacturers:      ()       => api.get('/equipment/manufacturers').then(r => r.data),
  systems:            (params) => api.get('/equipment/systems', { params }).then(r => r.data),
  createManufacturer: (data)   => api.post('/equipment/manufacturers', data).then(r => r.data),
  createSystem:       (data)   => api.post('/equipment/systems', data).then(r => r.data),
  bulkRetire:         (ids)    => api.post('/equipment/systems/bulk-retire', { ids }).then(r => r.data),
  deleteSystem:       (id)     => api.delete(`/equipment/systems/${id}`).then(r => r.data),
  deleteManufacturer: (id)     => api.delete(`/equipment/manufacturers/${id}`).then(r => r.data),
}

export const builders = {
  list:   () => api.get('/builders/').then(r => r.data),
  create: (data) => api.post('/builders/', data).then(r => r.data),
  update: (id, data) => api.patch(`/builders/${id}`, data).then(r => r.data),
  delete: (id)   => api.delete(`/builders/${id}`).then(r => r.data),
}

export const projects = {
  list:   () => api.get('/projects/').then(r => r.data),
  create: (data) => api.post('/projects/', data).then(r => r.data),
  delete: (id)   => api.delete(`/projects/${id}`).then(r => r.data),
  update: (id, data) => api.patch(`/projects/${id}`, data).then(r => r.data),
}

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export const documents = {
  generate:           (planId) => api.post(`/documents/${planId}/generate`).then(r => r.data),
  history:            (planId) => api.get(`/documents/${planId}/history`).then(r => r.data),
  preview:            (planId) => api.get(`/documents/${planId}/preview`, { responseType: 'blob' })
                                     .then(r => URL.createObjectURL(r.data)),
  download:           (planId, filename) => api.get(`/documents/${planId}/download`, { responseType: 'blob' })
                                     .then(r => triggerDownload(r.data, filename)),
  generateFieldSheet: (planId) => api.post(`/documents/${planId}/field-sheet/generate`).then(r => r.data),
  fieldSheetDownload: (planId, filename) => api.get(`/documents/${planId}/field-sheet/download`, { responseType: 'blob' })
                                     .then(r => triggerDownload(r.data, filename)),
  emailQuote: (planId, data) => api.post(`/documents/${planId}/email-quote`, data).then(r => r.data),
}

export const filesApi = {
  list:      () => api.get('/files/').then(r => r.data),
  serveBlob: (path) => api.get('/files/serve', { params: { path }, responseType: 'blob' }).then(r => r.data),
  download:  (path, filename) => api.get('/files/serve', { params: { path, download: true }, responseType: 'blob' })
                                    .then(r => triggerDownload(r.data, filename)),
}

export const lineItems = {
  add:    (planId, systemId, data) => api.post(`/plans/${planId}/systems/${systemId}/line-items`, data).then(r => r.data),
  update: (planId, id, data)       => api.patch(`/plans/${planId}/line-items/${id}`, data).then(r => r.data),
  delete: (planId, id)             => api.delete(`/plans/${planId}/line-items/${id}`).then(r => r.data),
}

export const houseTypes = {
  add: (planId, data) => api.post(`/plans/${planId}/house-types`, data).then(r => r.data),
}

export const houseTypeApi = {
  duplicate: (planId, houseTypeId) =>
    api.post(`/plans/${planId}/house-types/${houseTypeId}/duplicate`).then(r => r.data),
}

export const systems = {
  update: (planId, systemId, data) => api.patch(`/plans/${planId}/systems/${systemId}`, data).then(r => r.data),
}

export const search = {
  query: (q) => api.get('/search/', { params: { q } }).then(r => r.data),
}

export const kit = {
  calculate: (data) => api.post('/kit/calculate', data).then(r => r.data),
  list:      ()     => api.get('/kit/').then(r => r.data),
  update:    (id, data) => api.patch(`/kit/${id}`, data).then(r => r.data),
  create:    (data) => api.post('/kit/', data).then(r => r.data),
  remove:    (id)   => api.delete(`/kit/${id}`).then(r => r.data),
}

export const feedbackApi = {
  list:   ()         => api.get('/feedback').then(r => r.data),
  submit: (data)     => api.post('/feedback', data).then(r => r.data),
  update: (id, data) => api.patch(`/feedback/${id}`, data).then(r => r.data),
}
