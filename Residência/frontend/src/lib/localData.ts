
export const getLocalData = (key: string) => {
  const data = localStorage.getItem(`futgestao_${key}`);
  return data ? JSON.parse(data) : [];
};

export const setLocalData = (key: string, data: any) => {
  localStorage.setItem(`futgestao_${key}`, JSON.stringify(data));
};

export const getItemById = (key: string, id: string) => {
  const data = getLocalData(key);
  return data.find((item: any) => item.id === id);
};

export const saveLocalData = (key: string, item: any) => {
  const data = getLocalData(key);
  const newItem = { 
    ...item, 
    id: item.id || Math.random().toString(36).substr(2, 9),
    createdAt: item.createdAt || new Date().toISOString()
  };
  localStorage.setItem(`futgestao_${key}`, JSON.stringify([...data, newItem]));
  return newItem;
};

export const updateLocalData = (key: string, id: string, updates: any) => {
  const data = getLocalData(key);
  const updated = data.map((item: any) => item.id === id ? { ...item, ...updates } : item);
  localStorage.setItem(`futgestao_${key}`, JSON.stringify(updated));
  return updated.find((item: any) => item.id === id);
};

export const deleteLocalData = (key: string, id: string) => {
  const data = getLocalData(key);
  const filtered = data.filter((item: any) => item.id !== id);
  localStorage.setItem(`futgestao_${key}`, JSON.stringify(filtered));
};
