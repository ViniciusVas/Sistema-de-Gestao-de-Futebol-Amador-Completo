
import socket from "../services/socket";

export let isSyncingRemote = false;

if (typeof window !== "undefined") {
  // Setup listener for remote sync
  socket.on("local-data-sync", (payload: { key: string; data: any }) => {
    if (payload && payload.key) {
      isSyncingRemote = true;
      try {
        localStorage.setItem(`futgestao_${payload.key}`, JSON.stringify(payload.data));
        
        // Dispatch custom StorageEvent so current browser React states reload
        const event = new StorageEvent("storage", {
          key: payload.key,
          newValue: JSON.stringify(payload.data),
        });
        window.dispatchEvent(event);
      } catch (err) {
        console.error("Error setting remote synced localData:", err);
      } finally {
        isSyncingRemote = false;
      }
    }
  });

  // When connecting/reconnecting, sync the client data to populate the backend and fetch any server-side state
  const syncWithBackendOnConnect = () => {
    const keysToSync = ["peladas", "jogadores", "times", "championships", "playerStats"];
    for (const key of keysToSync) {
      const localVal = localStorage.getItem(`futgestao_${key}`);
      if (localVal) {
        try {
          const parsed = JSON.parse(localVal);
          if (parsed && (Array.isArray(parsed) ? parsed.length > 0 : Object.keys(parsed).length > 0)) {
            socket.emit("local-data-change", { key, data: parsed });
          }
        } catch (e) {}
      }
    }
    // Also ask server for any updates we might be missing
    socket.emit("request-initial-data");
  };

  if (socket.connected) {
    syncWithBackendOnConnect();
  } else {
    socket.on("connect", () => {
      syncWithBackendOnConnect();
    });
  }
}

export const getLocalData = (key: string) => {
  try {
    const raw = localStorage.getItem(`futgestao_${key}`);
    if (!raw) return [];
    let parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    
    if (key === "championships") {
      let needsRewrite = false;
      const repaired: any[] = [];
      for (const item of parsed) {
        if (!item) continue;
        if (Array.isArray(item)) {
          repaired.push(...item);
          needsRewrite = true;
        } else if (typeof item === "object") {
          if ("0" in item && !item.nome && !item.name) {
            Object.keys(item).forEach(k => {
              if (!isNaN(Number(k)) && item[k] && typeof item[k] === "object" && !Array.isArray(item[k])) {
                repaired.push(item[k]);
              }
            });
            needsRewrite = true;
          } else {
            repaired.push(item);
          }
        }
      }
      if (needsRewrite) {
        localStorage.setItem(`futgestao_${key}`, JSON.stringify(repaired));
        parsed = repaired;
      }
    }
    return parsed;
  } catch (e) {
    return [];
  }
};

export const setLocalData = (key: string, data: any) => {
  localStorage.setItem(`futgestao_${key}`, JSON.stringify(data));
  if (!isSyncingRemote) {
    socket.emit("local-data-change", { key, data });
  }
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
  setLocalData(key, [...data, newItem]);
  return newItem;
};

export const updateLocalData = (key: string, id: string, updates: any) => {
  const data = getLocalData(key);
  const updated = data.map((item: any) => item.id === id ? { ...item, ...updates } : item);
  setLocalData(key, updated);
  return updated.find((item: any) => item.id === id);
};

export const deleteLocalData = (key: string, id: string) => {
  const data = getLocalData(key);
  const filtered = data.filter((item: any) => item.id !== id);
  setLocalData(key, filtered);
};

