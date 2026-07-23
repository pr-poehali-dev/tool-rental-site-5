const CATALOG_URL = 'https://functions.poehali.dev/213fddb3-93a5-48f4-8b6d-33c53b14325d';
const ORDERS_URL = 'https://functions.poehali.dev/f90c3461-3335-46f3-a88a-7840ec3a353a';
const AUTH_URL = 'https://functions.poehali.dev/0a142230-94c7-497b-9474-dc169b7adcec';
const ADMIN_TOOLS_URL = 'https://functions.poehali.dev/57c48d74-1d91-4e4c-8ee7-673a291f9b59';
const CLIENTS_URL = 'https://functions.poehali.dev/83e99fc4-f512-4980-9255-d16955727b58';
const CLIENT_AUTH_URL = 'https://functions.poehali.dev/ba20e787-2790-4d8a-a823-87650d2d4bdb';
const CLIENT_ACCOUNT_URL = 'https://functions.poehali.dev/6e6b2653-d8e8-4d32-bf0b-b192ab6a89a3';
const YOOKASSA_URL = 'https://functions.poehali.dev/9a33e6a2-8e6d-4610-bb35-92e7daafb7cc';
const ANALYTICS_URL = 'https://functions.poehali.dev/7325a1da-51d9-488d-8b0b-b7274210aa4b';

export async function getCatalog() {
  const res = await fetch(CATALOG_URL);
  return res.json();
}

export function trackVisit(path: string) {
  try {
    let sessionId = sessionStorage.getItem('visit_session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('visit_session_id', sessionId);
    }
    fetch(ANALYTICS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, path }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* ignore */ }
}

export interface DailyAnalytics {
  date: string;
  visits: number;
  uniqueVisitors: number;
  orders: number;
}

export interface AnalyticsSummary {
  totalVisits: number;
  uniqueVisitors: number;
  totalOrders: number;
  conversionRate: number;
  daily: DailyAnalytics[];
}

export async function getAnalytics(token: string): Promise<AnalyticsSummary> {
  const res = await fetch(ANALYTICS_URL, { headers: { 'X-Admin-Token': token } });
  return res.json();
}

export interface SubmitOrderData {
  name: string;
  phone: string;
  email?: string;
  message: string;
  cart: unknown[];
  deliveryMethod: 'pickup' | 'delivery';
  deliveryAddress?: string;
  receiveDate?: string;
  receiveTime?: string;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'online';
}

export async function submitOrder(data: SubmitOrderData) {
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

export async function reorderItems(entity: string, token: string, order: number[]) {
  const res = await fetch(`${ADMIN_TOOLS_URL}?entity=${entity}&action=reorder`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
    body: JSON.stringify({ order }),
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

export async function getOrders(token: string, archived = false) {
  const res = await fetch(`${ORDERS_URL}${archived ? '?archived=1' : ''}`, { headers: { 'X-Admin-Token': token } });
  return res.json();
}

export async function updateOrderStatus(token: string, id: number, status: string, comment?: string) {
  const res = await fetch(ORDERS_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
    body: JSON.stringify({ id, status, comment: comment || '' }),
  });
  return res.json();
}

export async function extendOrder(token: string, id: number, extraDays: number, newAmount: number) {
  const res = await fetch(ORDERS_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
    body: JSON.stringify({ id, action: 'extend', extraDays, newAmount }),
  });
  return res.json();
}

export async function rejectOrder(token: string, id: number, reason: string) {
  const res = await fetch(ORDERS_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
    body: JSON.stringify({ id, action: 'reject', reason }),
  });
  return res.json();
}

export interface DepositResolutionItem {
  toolId: number;
  name: string;
  amount: number;
  refunded: boolean;
  reason?: string;
  evidence?: string[];
}

export async function resolveDeposit(token: string, id: number, refundAmount: number, resolution: DepositResolutionItem[]) {
  const res = await fetch(ORDERS_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
    body: JSON.stringify({ id, action: 'resolve_deposit', refundAmount, resolution }),
  });
  return res.json();
}

export async function confirmDepositRefund(token: string, id: number) {
  const res = await fetch(ORDERS_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
    body: JSON.stringify({ id, action: 'confirm_deposit_refund' }),
  });
  return res.json();
}

export async function uploadEvidence(token: string, file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch(`${ADMIN_TOOLS_URL}?action=upload_evidence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
          body: JSON.stringify({ data: reader.result as string, filename: file.name }),
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

export async function deleteOrder(token: string, id: number) {
  const res = await fetch(`${ORDERS_URL}?id=${id}`, {
    method: 'DELETE',
    headers: { 'X-Admin-Token': token },
  });
  return res.json();
}

export interface ActItem {
  name: string;
  qty: number;
  inventoryNumber?: string;
  state: string;
}

export interface ActData {
  representativeName: string;
  clientFullName: string;
  clientPassport: string;
  items: ActItem[];
  depositTotal: number;
  depositWithheld?: number;
  depositReturned?: number;
  damageNotes?: string;
  notes: string;
}

export async function updateAct(token: string, id: number, kind: 'handover' | 'return', data: ActData) {
  const res = await fetch(ORDERS_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
    body: JSON.stringify({ id, action: 'update_act', kind, data }),
  });
  return res.json();
}

export async function getPublicOrder(id: string) {
  const res = await fetch(`${ORDERS_URL}?public=1&id=${id}`);
  if (!res.ok) return null;
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

export async function addClientAddress(token: string, phone: string, address: string, label: string) {
  const res = await fetch(`${CLIENTS_URL}?action=add_address`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
    body: JSON.stringify({ phone, address, label }),
  });
  return res.json();
}

export async function deleteClientAddress(token: string, id: number) {
  const res = await fetch(`${CLIENTS_URL}?action=address&id=${id}`, {
    method: 'DELETE',
    headers: { 'X-Admin-Token': token },
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

// ===== Документы раздела «Условия аренды» =====

export interface LegalDocument {
  id: number;
  title: string;
  fileUrl: string;
  fileType: string;
}

export async function uploadLegalDoc(token: string, file: File): Promise<{ url: string; fileType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch(`${ADMIN_TOOLS_URL}?action=upload_legal_doc`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
          body: JSON.stringify({ data: reader.result as string, filename: file.name }),
        });
        const data = await res.json();
        if (data.url) resolve({ url: data.url, fileType: data.fileType });
        else reject(new Error(data.error || 'Ошибка загрузки'));
      } catch (e) { reject(e); }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function getLegalDocuments(token: string): Promise<LegalDocument[]> {
  const res = await fetch(`${ADMIN_TOOLS_URL}?entity=legal_documents`, {
    headers: { 'X-Admin-Token': token },
  });
  return res.json();
}

export async function addLegalDocument(token: string, title: string, fileUrl: string, fileType: string) {
  const res = await fetch(`${ADMIN_TOOLS_URL}?entity=legal_documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
    body: JSON.stringify({ title, fileUrl, fileType }),
  });
  return res.json();
}

export async function deleteLegalDocument(token: string, id: number) {
  const res = await fetch(`${ADMIN_TOOLS_URL}?entity=legal_documents&id=${id}`, {
    method: 'DELETE',
    headers: { 'X-Admin-Token': token },
  });
  return res.json();
}

// ===== Личный кабинет клиента =====

export async function requestClientCode(channel: 'email' | 'phone', contact: string, fullName?: string) {
  const res = await fetch(`${CLIENT_AUTH_URL}?action=request_code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel, contact, fullName: fullName || '' }),
  });
  return { ok: res.ok, data: await res.json() };
}

export async function verifyClientCode(channel: 'email' | 'phone', contact: string, code: string) {
  const res = await fetch(`${CLIENT_AUTH_URL}?action=verify_code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel, contact, code }),
  });
  return { ok: res.ok, data: await res.json() };
}

export async function checkClientToken(token: string) {
  const res = await fetch(`${CLIENT_AUTH_URL}?token=${token}`);
  if (!res.ok) return null;
  return res.json();
}

export async function clientLogout(token: string) {
  await fetch(`${CLIENT_AUTH_URL}?action=logout`, {
    method: 'POST',
    headers: { 'X-Client-Token': token },
  });
}

export async function getClientAccount(token: string) {
  const res = await fetch(CLIENT_ACCOUNT_URL, { headers: { 'X-Client-Token': token } });
  return res.json();
}

export async function updateClientProfile(token: string, fullName: string) {
  const res = await fetch(CLIENT_ACCOUNT_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Client-Token': token },
    body: JSON.stringify({ fullName }),
  });
  return res.json();
}

export async function addAccountAddress(token: string, address: string, label: string) {
  const res = await fetch(`${CLIENT_ACCOUNT_URL}?action=add_address`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Client-Token': token },
    body: JSON.stringify({ address, label }),
  });
  return res.json();
}

export async function setDefaultAddress(token: string, id: number) {
  const res = await fetch(`${CLIENT_ACCOUNT_URL}?action=set_default_address`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Client-Token': token },
    body: JSON.stringify({ id }),
  });
  return res.json();
}

export async function deleteAccountAddress(token: string, id: number) {
  const res = await fetch(`${CLIENT_ACCOUNT_URL}?action=address&id=${id}`, {
    method: 'DELETE',
    headers: { 'X-Client-Token': token },
  });
  return res.json();
}

export async function submitOrderAuthed(token: string, data: SubmitOrderData) {
  const res = await fetch(ORDERS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Client-Token': token },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function createYookassaPayment(orderId: number) {
  const res = await fetch(YOOKASSA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId }),
  });
  return { ok: res.ok, data: await res.json() };
}

export async function uploadPdf(token: string, file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch(`${ADMIN_TOOLS_URL}?action=upload_pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
          body: JSON.stringify({ data: reader.result as string, filename: file.name }),
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