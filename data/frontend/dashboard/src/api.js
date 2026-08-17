import axios from 'axios'

const BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8000' 
  : '/api'

const api = axios.create({ baseURL: BASE_URL })

// Add client_id to every request
api.interceptors.request.use(config => {
  const clientId = localStorage.getItem('client_id')
  if (clientId) config.headers['x-client-id'] = clientId
  return config
})

// Auto-logout on 401 — but NOT for auth endpoints (login/register)
// so that wrong-password errors don't cause a reload loop
api.interceptors.response.use(
  res => res,
  err => {
    const url = err.config?.url || ''
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/team-login')
    if (err.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('client_id')
      localStorage.removeItem('client_data')
      window.location.reload()
    }
    return Promise.reject(err)
  }
)

export default api
