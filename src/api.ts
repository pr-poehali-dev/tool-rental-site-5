const CATALOG_URL = 'https://functions.poehali.dev/213fddb3-93a5-48f4-8b6d-33c53b14325d';
const ORDERS_URL = 'https://functions.poehali.dev/f90c3461-3335-46f3-a88a-7840ec3a353a';
const AUTH_URL = 'https://functions.poehali.dev/0a142230-94c7-497b-9474-dc169b7adcec';
const ADMIN_TOOLS_URL = 'https://functions.poehali.dev/57c48d74-1d91-4e4c-8ee7-673a291f9b59';
const CLIENTS_URL = 'https://functions.poehali.dev/83e99fc4-f512-4980-9255-d16955727b58';

export async function getCatalog() {
  const res = await fetch(CATALOG_URL);
  return res.json();
}

export async function submitOrder(data: { name: string; phone: string; message: string; cart: unknown[] }) {
  const res = await fetch(ORDERS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function adminLogin(login: string, password: string) {
  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password }),
  });
  return { ok: res.ok, data: await res.json() };
}

export async function checkAdminToken(token: string) {
  const res = await fetch(`${AUTH_URL}?token=${token}`);
  return res.ok;
}

export async function adminGet(entity: string, token: string) {
  const res = await fetch(`${ADMIN_TOOLS_URL}?entity=${entity}`, {
    headers: { 'X-Admin-Token': token },
  });
  return res.json();
}

export async function adminCreate(entity: string, token: string, data: unknown) {
  const res = await fetch(`${ADMIN_TOOLS_URL}?entity=${entity}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function adminUpdate(entity: string, token: string, data: unknown) {
  const res = await fetch(`${ADMIN_TOOLS_URL}?entity=${entity}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function adminDelete(entity: string, token: string, id: number) {
  const res = await fetch(`${ADMIN_TOOLS_URL}?entity=${entity}&id=${id}`, {
    method: 'DELETE',
    headers: { 'X-Admin-Token': token },
  });
  return res.json();
}

export async function getOrders(token: string) {
  const res = await fetch(ORDERS_URL, { headers: { 'X-Admin-Token': token } });
  return res.json();
}

export async function updateOrderStatus(token: string, id: number, status: string) {
  const res = await fetch(ORDERS_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
    body: JSON.stringify({ id, status }),
  });
  return res.json();
}

export async function getClients(token: string) {
  const res = await fetch(CLIENTS_URL, { headers: { 'X-Admin-Token': token } });
  return res.json();
}

export async function getClientOrders(token: string, phone: string) {
  const res = await fetch(`${CLIENTS_URL}?phone=${encodeURIComponent(phone)}`, {
    headers: { 'X-Admin-Token': token },
  });
  return res.json();
}

export async function updateClient(token: string, data: { phone: string; fullName: string; notes: string }) {
  const res = await fetch(CLIENTS_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function uploadImageBase64(token: string, file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch(`${ADMIN_TOOLS_URL}?action=upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
          body: JSON.stringify({ source: 'base64', data: reader.result as string, filename: file.name }),
        });
        const data = await res.json();
        if (data.url) resolve(data.url);
        else reject(new Error(data.error || 'Ошибка загрузки'));
      } catch (e) { reject(e); }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function uploadImageUrl(token: string, url: string): Promise<string> {
  const res = await fetch(`${ADMIN_TOOLS_URL}?action=upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
    body: JSON.stringify({ source: 'url', data: url }),
  });
  const data = await res.json();
  if (data.url) return data.url;
  throw new Error(data.error || 'Ошибка загрузки');
}