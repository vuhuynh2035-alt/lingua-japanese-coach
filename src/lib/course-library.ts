export type CourseQuestion = {
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
};

export type CourseLesson = {
  id: string;
  level: "A1" | "A2" | "B1" | "B2";
  unit: string;
  /** Lesson focus shown as a tag, e.g. "Giao tiếp", "Ngữ pháp". Packs before 2.0 have none. */
  category?: string;
  title: string;
  objective: string;
  reading: string;
  /** `reading` is the romaji / pinyin of `term`; `example` is "sentence (Vietnamese meaning)". */
  vocabulary: { term: string; reading?: string; definition: string; example?: string }[];
  /** The lesson's conversation, line by line, with its reading aid and Vietnamese translation. */
  dialogue?: { speaker?: string; text: string; phonetic?: string; translation?: string }[];
  grammar?: { title: string; explanation: string; examples: string[] };
  pronunciation?: { focus: string; tip: string; words: string[] };
  speakingTasks?: string[];
  questions: CourseQuestion[];
  audioIds: string[];
};

/** Bundled curriculum version; a stored pack with another version is re-downloaded. */
export const CURRICULUM_VERSION = "1.1.0";
/** A lesson is passed with at least this share of correct answers (8/10). */
export const LESSON_PASS_RATIO = 0.8;

export type CourseAudio = {
  id: string;
  title: string;
  path: string;
  durationSeconds: number;
  license: string;
  attribution: string;
};

export type CourseReference = { title: string; url: string; license: string };

export type CoursePackage = {
  id: string;
  title: string;
  version: string;
  framework: string;
  overview: string;
  contentLicense: string;
  references: CourseReference[];
  lessons: CourseLesson[];
  audio: CourseAudio[];
};

export type StoredCourse = CoursePackage & { downloadedAt: string };
type StoredAudio = { key: string; courseId: string; blob: Blob; mediaType: string };

const DATABASE_NAME = "lingua-jp-offline-courses";
const DATABASE_VERSION = 1;
const COURSE_STORE = "courses";
const AUDIO_STORE = "audio";

function openCourseDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(COURSE_STORE)) {
        database.createObjectStore(COURSE_STORE, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(AUDIO_STORE)) {
        const audioStore = database.createObjectStore(AUDIO_STORE, { keyPath: "key" });
        audioStore.createIndex("courseId", "courseId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open offline course storage."));
    request.onblocked = () => reject(new Error("Close other Teacher AI tabs to update offline course storage."));
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCourseQuestion(value: unknown): value is CourseQuestion {
  return isRecord(value) && typeof value.prompt === "string" &&
    Array.isArray(value.options) && value.options.length >= 2 &&
    value.options.every((option: unknown) => typeof option === "string") &&
    Number.isInteger(value.answer) && Number(value.answer) >= 0 &&
    Number(value.answer) < value.options.length &&
    typeof value.explanation === "string";
}

function isCourseLesson(value: unknown): value is CourseLesson {
  return isRecord(value) && typeof value.id === "string" &&
    ["A1", "A2", "B1", "B2"].includes(String(value.level)) &&
    typeof value.unit === "string" && typeof value.title === "string" &&
    typeof value.objective === "string" && typeof value.reading === "string" &&
    Array.isArray(value.vocabulary) && value.vocabulary.every((word: unknown) =>
      isRecord(word) && typeof word.term === "string" && typeof word.definition === "string") &&
    Array.isArray(value.questions) && value.questions.every(isCourseQuestion) &&
    Array.isArray(value.audioIds) && value.audioIds.every((id: unknown) => typeof id === "string");
}

function isCourseAudio(value: unknown): value is CourseAudio {
  return isRecord(value) && typeof value.id === "string" && typeof value.title === "string" &&
    typeof value.path === "string" && value.path.startsWith("/courses/audio/") &&
    !value.path.includes("..") && typeof value.durationSeconds === "number" && value.durationSeconds > 0 &&
    typeof value.license === "string" && typeof value.attribution === "string";
}

function isCourseReference(value: unknown): value is CourseReference {
  return isRecord(value) && typeof value.title === "string" &&
    typeof value.url === "string" && typeof value.license === "string";
}

function parseCoursePackage(value: unknown, expectedId: string): CoursePackage {
  if (!isRecord(value) || value.id !== expectedId ||
      typeof value.title !== "string" || typeof value.version !== "string" ||
      typeof value.framework !== "string" || typeof value.overview !== "string" ||
      typeof value.contentLicense !== "string" ||
      !Array.isArray(value.references) || !value.references.every(isCourseReference) ||
      !Array.isArray(value.lessons) || !value.lessons.every(isCourseLesson) ||
      !Array.isArray(value.audio) || !value.audio.every(isCourseAudio)) {
    throw new Error("The downloaded course package has an invalid format.");
  }
  if (value.lessons.length === 0 || value.references.length === 0) {
    throw new Error("This course package is missing lessons or source and license references.");
  }
  const audioIds = new Set(value.audio.map((audio) => audio.id));
  if (value.lessons.some((lesson) => lesson.audioIds.some((id) => !audioIds.has(id)))) {
    throw new Error("This course package refers to an audio file that is not included.");
  }
  return {
    id: value.id,
    title: value.title,
    version: value.version,
    framework: value.framework,
    overview: value.overview,
    contentLicense: value.contentLicense,
    references: value.references,
    lessons: value.lessons,
    audio: value.audio,
  };
}

export async function listDownloadedCourses(): Promise<StoredCourse[]> {
  const database = await openCourseDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(COURSE_STORE, "readonly");
      const request = transaction.objectStore(COURSE_STORE).getAll();
      request.onsuccess = () => resolve(request.result as StoredCourse[]);
      request.onerror = () => reject(request.error ?? new Error("Unable to read downloaded courses."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Reading downloaded courses was interrupted."));
    });
  } finally {
    database.close();
  }
}

export async function getDownloadedCourse(courseId: string): Promise<CoursePackage | null> {
  const database = await openCourseDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(COURSE_STORE, "readonly");
      const request = transaction.objectStore(COURSE_STORE).get(courseId);
      request.onsuccess = () => resolve((request.result as StoredCourse | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error("Unable to open the downloaded course."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Opening the downloaded course was interrupted."));
    });
  } finally {
    database.close();
  }
}

export async function getDownloadedAudio(courseId: string, audioId: string): Promise<Blob | null> {
  const database = await openCourseDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(AUDIO_STORE, "readonly");
      const request = transaction.objectStore(AUDIO_STORE).get(`${courseId}:${audioId}`);
      request.onsuccess = () => resolve((request.result as StoredAudio | undefined)?.blob ?? null);
      request.onerror = () => reject(request.error ?? new Error("Unable to read the offline audio file."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Reading offline audio was interrupted."));
    });
  } finally {
    database.close();
  }
}

export async function downloadCoursePackage(
  courseId: string,
  basePath: string,
  onProgress: (completed: number, total: number) => void,
): Promise<CoursePackage> {
  const packageResponse = await fetch(`${basePath}/courses/${encodeURIComponent(courseId)}.json`);
  if (!packageResponse.ok) {
    throw new Error(`Unable to download this course package (HTTP ${packageResponse.status}).`);
  }
  const course = parseCoursePackage(await packageResponse.json() as unknown, courseId);
  const audioFiles: StoredAudio[] = [];
  for (const asset of course.audio) {
    const audioResponse = await fetch(`${basePath}${asset.path}`);
    if (!audioResponse.ok) {
      throw new Error(`Unable to download audio “${asset.title}” (HTTP ${audioResponse.status}).`);
    }
    const blob = await audioResponse.blob();
    if (!blob.size || !blob.type.startsWith("audio/")) {
      throw new Error(`The audio file “${asset.title}” is empty or has an unsupported media type.`);
    }
    audioFiles.push({
      key: `${course.id}:${asset.id}`,
      courseId: course.id,
      blob,
      mediaType: blob.type,
    });
    onProgress(audioFiles.length, course.audio.length);
  }

  const database = await openCourseDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction([COURSE_STORE, AUDIO_STORE], "readwrite");
      const courses = transaction.objectStore(COURSE_STORE);
      const audioStore = transaction.objectStore(AUDIO_STORE);
      const previousAudioRequest = audioStore.index("courseId").getAllKeys(course.id);
      previousAudioRequest.onsuccess = () => {
        for (const key of previousAudioRequest.result) audioStore.delete(key);
        courses.put({ ...course, downloadedAt: new Date().toISOString() } satisfies StoredCourse);
        for (const audio of audioFiles) audioStore.put(audio);
      };
      previousAudioRequest.onerror = () => transaction.abort();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Unable to save the course package."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Saving the course package was interrupted."));
    });
  } finally {
    database.close();
  }
  return course;
}

export async function removeDownloadedCourse(courseId: string): Promise<void> {
  const database = await openCourseDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction([COURSE_STORE, AUDIO_STORE], "readwrite");
      transaction.objectStore(COURSE_STORE).delete(courseId);
      const audioStore = transaction.objectStore(AUDIO_STORE);
      const request = audioStore.index("courseId").getAllKeys(courseId);
      request.onsuccess = () => {
        for (const key of request.result) audioStore.delete(key);
      };
      request.onerror = () => transaction.abort();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Unable to remove the downloaded course."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Removing the downloaded course was interrupted."));
    });
  } finally {
    database.close();
  }
}
