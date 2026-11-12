import axios from 'axios';

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshSubscribers.push((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
          // If refresh ultimately fails, reject queued requests
          setTimeout(() => reject(error), 10000);
        });
      }
      isRefreshing = true;
      try {
        const { data } = await axios.post<{ accessToken: string }>('/api/v1/auth/refresh', null, {
          withCredentials: true,
        });
        accessToken = data.accessToken;
        onRefreshed(data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        accessToken = null;
        window.location.href = '/login';
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export async function tryRestoreSession(): Promise<boolean> {
  try {
    const { data } = await axios.post<{ accessToken: string }>('/api/v1/auth/refresh', null, {
      withCredentials: true,
    });
    accessToken = data.accessToken;
    return true;
  } catch {
    return false;
  }
}
