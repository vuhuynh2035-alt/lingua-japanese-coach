export type PersonalMaterial = {
  id: string;
  name: string;
  type: "pdf" | "audio" | "text";
  mediaType: string;
  size: number;
  addedAt: string;
};

type StoredMaterial = PersonalMaterial & { file: Blob };

const DATABASE_NAME = "lingua-jp-personal-library";
const DATABASE_VERSION = 1;
const MATERIAL_STORE = "materials";
const MAX_FILE_SIZE = 50 * 1024 * 1024;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(MATERIAL_STORE)) {
        request.result.createObjectStore(MATERIAL_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Không thể mở thư viện tài liệu trên thiết bị."));
    request.onblocked = () => reject(new Error("Hãy đóng các thẻ Teacher AI khác rồi thử lại."));
  });
}

function getMaterialType(file: File): PersonalMaterial["type"] | null {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (file.type === "application/pdf" || extension === "pdf") return "pdf";
  if (file.type.startsWith("audio/") || ["mp3", "m4a", "wav", "ogg", "opus", "aac", "flac"].includes(extension ?? "")) {
    return "audio";
  }
  if (file.type.startsWith("text/") || ["txt", "md"].includes(extension ?? "")) return "text";
  return null;
}

function getMediaType(file: File, type: PersonalMaterial["type"]): string {
  if (file.type) return file.type;
  if (type === "pdf") return "application/pdf";
  if (type === "text") return "text/plain";
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "m4a") return "audio/mp4";
  if (extension === "wav") return "audio/wav";
  if (extension === "ogg" || extension === "opus") return "audio/ogg";
  if (extension === "aac") return "audio/aac";
  if (extension === "flac") return "audio/flac";
  return "audio/mpeg";
}

function toMetadata(item: StoredMaterial): PersonalMaterial {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    mediaType: item.mediaType,
    size: item.size,
    addedAt: item.addedAt,
  };
}

export async function listPersonalMaterials(): Promise<PersonalMaterial[]> {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(MATERIAL_STORE, "readonly");
      const request = transaction.objectStore(MATERIAL_STORE).getAll();
      request.onsuccess = () => {
        const materials = (request.result as StoredMaterial[])
          .map(toMetadata)
          .sort((left, right) => right.addedAt.localeCompare(left.addedAt));
        resolve(materials);
      };
      request.onerror = () => reject(request.error ?? new Error("Không thể đọc thư viện tài liệu."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Đọc thư viện tài liệu bị gián đoạn."));
    });
  } finally {
    database.close();
  }
}

export async function addPersonalMaterial(file: File): Promise<PersonalMaterial> {
  const type = getMaterialType(file);
  if (!type) throw new Error("Chỉ hỗ trợ PDF, audio (MP3, M4A, WAV...) và văn bản TXT/MD.");
  if (!file.size) throw new Error("Tệp đang trống, vui lòng chọn tệp khác.");
  if (file.size > MAX_FILE_SIZE) throw new Error("Mỗi tệp tối đa 50 MB để hạn chế đầy bộ nhớ thiết bị.");
  const id = crypto.randomUUID();
  const mediaType = getMediaType(file, type);
  const stored: StoredMaterial = {
    id,
    name: file.name,
    type,
    mediaType,
    size: file.size,
    addedAt: new Date().toISOString(),
    file: file.slice(0, file.size, mediaType),
  };

  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(MATERIAL_STORE, "readwrite");
      transaction.objectStore(MATERIAL_STORE).add(stored);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Không thể lưu tệp. Bộ nhớ thiết bị có thể đã đầy."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Lưu tệp bị gián đoạn."));
    });
  } finally {
    database.close();
  }
  return toMetadata(stored);
}

export async function getPersonalMaterial(id: string): Promise<{ metadata: PersonalMaterial; file: Blob } | null> {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(MATERIAL_STORE, "readonly");
      const request = transaction.objectStore(MATERIAL_STORE).get(id);
      request.onsuccess = () => {
        const item = request.result as StoredMaterial | undefined;
        resolve(item ? { metadata: toMetadata(item), file: item.file } : null);
      };
      request.onerror = () => reject(request.error ?? new Error("Không thể mở tài liệu đã lưu."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Mở tài liệu bị gián đoạn."));
    });
  } finally {
    database.close();
  }
}

export async function removePersonalMaterial(id: string): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(MATERIAL_STORE, "readwrite");
      transaction.objectStore(MATERIAL_STORE).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Không thể xóa tài liệu."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Xóa tài liệu bị gián đoạn."));
    });
  } finally {
    database.close();
  }
}
