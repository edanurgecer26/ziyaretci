import { API_URL } from './constants';
import type { Visitor } from './types';
export const createVisitLog = async (visitorId: string) => {
  const response = await fetch(`${API_URL}/visit-logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: {
        visitDate: new Date().toISOString(),
        visitor: visitorId // Kimin geldiğini buraya bağlıyoruz
      },
    }),
  });

  if (!response.ok) {
    throw new Error('Ziyaret günlüğü oluşturulurken hata!');
  }
  return await response.json();
};

export const createVisitor = async (visitorData: Omit<Visitor, 'id' | 'createdAt'>): Promise<Visitor> => {
  const checkResponse = await fetch(`${API_URL}/visitors?filters[identityNumber][$eq]=${visitorData.identityNumber}`);
  const checkResult = await checkResponse.json();

  if (checkResult.data && checkResult.data.length > 0) {
    return checkResult.data[0]; 
  }

  const response = await fetch(`${API_URL}/visitors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: visitorData }),
  });

  if (!response.ok) {
    throw new Error('Ziyaretçi kaydedilirken bir hata oluştu!');
  }
  
  const result = await response.json();
  return result.data;
};

export const checkOutVisitor = async (idOrDocumentId: string, exitGuard: string): Promise<Visitor> => {
  const exitTime = new Date().toISOString();
  const response = await fetch(`${API_URL}/visitors/${idOrDocumentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        exitTime,
        exitGuard,
      },
    }),
  });
  if (!response.ok) {
    throw new Error('Ziyaretçi çıkış işlemi sırasında bir hata oluştu!');
  }
  const result = await response.json();
  return result.data;
};

export const updateVisitor = async (
  idOrDocumentId: string,
  visitorData: Partial<Omit<Visitor, 'id' | 'createdAt'>>
): Promise<Visitor> => {
  const response = await fetch(`${API_URL}/visitors/${idOrDocumentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data: visitorData }),
  });
  if (!response.ok) {
    throw new Error('Ziyaretçi güncellenirken bir hata oluştu!');
  }
  const result = await response.json();
  return result.data;
};

export const deleteVisitor = async (idOrDocumentId: string): Promise<void> => {
  const response = await fetch(`${API_URL}/visitors/${idOrDocumentId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Ziyaretçi silinirken bir hata oluştu!');
  }
};
export const getVisitors = async () => {
  const response = await fetch(`${API_URL}/visitors`);
  if (!response.ok) {
    throw new Error('Ziyaretçiler alınırken hata oluştu!');
  }
  const result = await response.json();
  return result.data;
};