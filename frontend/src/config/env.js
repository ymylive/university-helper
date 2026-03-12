export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  environment: import.meta.env.MODE || 'development'
}
