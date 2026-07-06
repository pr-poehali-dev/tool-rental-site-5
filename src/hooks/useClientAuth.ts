import { useState, useEffect, useCallback } from 'react';
import { checkClientToken, clientLogout } from '@/api';

export interface ClientInfo {
  id: number;
  phone: string;
  email: string;
  fullName: string;
  verified: boolean;
}

const STORAGE_KEY = 'client_token';

export function useClientAuth() {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!token) { setChecked(true); return; }
    checkClientToken(token).then((res) => {
      if (res && res.valid) {
        setClient(res.client);
      } else {
        localStorage.removeItem(STORAGE_KEY);
        setToken('');
      }
      setChecked(true);
    });
  }, [token]);

  const login = useCallback((newToken: string, clientInfo: ClientInfo) => {
    localStorage.setItem(STORAGE_KEY, newToken);
    setToken(newToken);
    setClient(clientInfo);
  }, []);

  const logout = useCallback(async () => {
    if (token) await clientLogout(token);
    localStorage.removeItem(STORAGE_KEY);
    setToken('');
    setClient(null);
  }, [token]);

  return { token, client, authed: !!client, checked, login, logout };
}
