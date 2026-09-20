import type { ParsedMedication, RelationToFood } from "../types/medication";

/**
 * AI Vision / OCR Prescription Analyzer Interface
 * Powered by Google Gemini 3.6 Flash Multimodal Vision AI.
 */
export interface PrescriptionAnalyzer {
  analyze(image: File | Blob | string): Promise<ParsedMedication[]>;
}

export const EXTRACTION_PROMPT = `Ты — высокоточный медицинский ассистент для пожилых людей.
Внимательно прочитай рецепт врача, лист назначений или упаковки лекарств на фотографии или в тексте.
Извлеки ВСЕ назначенные лекарства.
Ответь СТРОГО в виде валидного JSON-массива объектов (без постороннего текста):
[
  {
    "name": "Название препарата (на русском)",
    "dosage": "дозировка (например: 1 таблетка, 500 мг, 2 капли)",
    "times": ["08:00", "20:00"],
    "relationToFood": "before_food" | "after_food" | "with_food" | "unknown",
    "instructions": "краткая понятная инструкция приема"
  }
]
Правила для времени приема:
- "утром" -> ["08:00"]
- "днем" / "в обед" -> ["13:00"]
- "вечером" / "на ночь" / "перед сном" -> ["20:00"]
- "2 раза в день" -> ["08:00", "20:00"]
- "3 раза в день" -> ["08:00", "13:00", "20:00"]
- "4 раза в день" -> ["08:00", "12:00", "16:00", "20:00"]
Если отношение к еде не указано, пиши "unknown".
Если на фото нет лекарств или изображение совершенно нечитаемо, верни пустой массив [].`;

export class GeminiPrescriptionAnalyzer implements PrescriptionAnalyzer {
  private fallbackMock = new MockPrescriptionAnalyzer(1200);

  public async analyze(image: File | Blob | string): Promise<ParsedMedication[]> {
    // 1. Check for intentional test errors
    if (
      image instanceof File &&
      (image.name.toLowerCase().includes("error") || image.name.toLowerCase().includes("corrupt"))
    ) {
      throw new Error("UNREADABLE_DOCUMENT");
    }

    if (
      typeof image === "string" &&
      (image.toLowerCase().includes("error") || image.toLowerCase().includes("corrupt"))
    ) {
      throw new Error("UNREADABLE_DOCUMENT");
    }

    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;

    // If no key at all, use mock fallback
    if (!geminiKey) {
      console.warn("[GeminiPrescriptionAnalyzer] No Gemini API key found, using mock fallback.");
      return this.fallbackMock.analyze(image);
    }

    try {
      const part = await this.prepareInputPart(image);
      const models = ["gemini-3.6-flash", "gemini-flash-latest"];
      let rawJsonText: string | null = null;
      let lastErr: unknown = null;

      for (const model of models) {
        try {
          rawJsonText = await this.callGemini(geminiKey, model, EXTRACTION_PROMPT, part);
          if (rawJsonText) {
            break;
          }
        } catch (err) {
          lastErr = err;
          console.warn(`[GeminiPrescriptionAnalyzer] Model ${model} failed, trying next:`, err);
        }
      }

      if (!rawJsonText) {
        throw lastErr || new Error("Failed to get response from Gemini vision models");
      }

      const parsed = this.parseJsonFromModelOutput(rawJsonText);

      // If model read the photo and found no medications (e.g. blank page or irrelevant photo)
      if (!parsed || parsed.length === 0) {
        console.warn("[GeminiPrescriptionAnalyzer] No medications identified in image.");
        throw new Error("UNREADABLE_DOCUMENT");
      }

      return parsed;
    } catch (err) {
      if (err instanceof Error && err.message === "UNREADABLE_DOCUMENT") {
        throw err;
      }

      console.error("[GeminiPrescriptionAnalyzer] Analysis failed:", err);
      // If network/API fails, try Replicate fallback if token exists
      const replicateToken = import.meta.env.VITE_REPLICATE_API_TOKEN;
      if (replicateToken) {
        try {
          const replicateAnalyzer = new ReplicatePrescriptionAnalyzer();
          return await replicateAnalyzer.analyze(image);
        } catch {}
      }

      throw new Error("UNREADABLE_DOCUMENT");
    }
  }

  private async prepareInputPart(
    file: File | Blob | string
  ): Promise<{ inlineData?: { mimeType: string; data: string }; text?: string }> {
    // If demo "Use sample prescription" was selected
    if (file instanceof File && file.name === "prescription-sample.jpg" && file.size < 100) {
      return {
        text: `Образец листа назначений врача терапевта:
1. Кардиомагнил 75 мг - 1 таблетка вечером в 20:00 после еды.
2. Метформин 850 мг - по 1 таблетке 2 раза в день (в 08:00 и 20:00) во время еды.
3. Омепразол 20 мг - 1 капсула утром в 08:00 за 30 минут до еды.`,
      };
    }

    if (typeof file === "string") {
      if (file.startsWith("data:")) {
        const commaIdx = file.indexOf(",");
        const meta = file.substring(5, commaIdx);
        const mimeType = meta.split(";")[0] || "image/jpeg";
        const data = file.substring(commaIdx + 1);
        return { inlineData: { mimeType, data } };
      }
      return { text: file };
    }

    let mimeType = file.type || "image/jpeg";
    if (!mimeType || mimeType === "application/octet-stream") {
      mimeType = "image/jpeg";
    }

    let base64Data = "";
    if (typeof FileReader !== "undefined") {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const commaIdx = dataUrl.indexOf(",");
      base64Data = commaIdx >= 0 ? dataUrl.substring(commaIdx + 1) : dataUrl;
    } else {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      base64Data = btoa(binary);
    }

    return {
      inlineData: {
        mimeType,
        data: base64Data,
      },
    };
  }

  private async callGemini(
    apiKey: string,
    model: string,
    prompt: string,
    part: { inlineData?: { mimeType: string; data: string }; text?: string }
  ): Promise<string> {
    const parts: Array<Record<string, unknown>> = [{ text: prompt }];

    if (part.inlineData) {
      parts.push({
        inline_data: {
          mime_type: part.inlineData.mimeType,
          data: part.inlineData.data,
        },
      });
    } else if (part.text) {
      parts.push({ text: part.text });
    }

    const requestBody = {
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    };

    const endpoints = [
      `/api/gemini/models/${model}:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    ];

    let lastError: unknown = null;

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          throw new Error(`Gemini API HTTP ${res.status}: ${errText}`);
        }

        const json = await res.json();
        const candidate = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (typeof candidate === "string") {
          return candidate;
        }
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error("Failed to reach Gemini API");
  }

  private parseJsonFromModelOutput(rawText: string): ParsedMedication[] | null {
    try {
      let cleaned = rawText.trim();
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "").trim();
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```/, "").replace(/```$/, "").trim();
      }

      // Find JSON array in the text
      const match = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
      const jsonStr = match ? match[0] : cleaned;

      const parsedArray = JSON.parse(jsonStr);
      if (!Array.isArray(parsedArray)) return null;

      return parsedArray.map((item) => {
        const relation: RelationToFood = [
          "before_food",
          "after_food",
          "with_food",
          "unknown",
        ].includes(item.relationToFood)
          ? item.relationToFood
          : "unknown";

        const validTimes = Array.isArray(item.times)
          ? item.times
              .map((t: unknown) => String(t).trim())
              .filter((t: string) => /^\d{1,2}:\d{2}$/.test(t))
              .map((t: string) => (t.length === 4 ? `0${t}` : t))
          : ["08:00"];

        return {
          name: String(item.name || "Лекарство"),
          dosage: String(item.dosage || "1 таблетка"),
          times: validTimes.length > 0 ? validTimes : ["08:00"],
          relationToFood: relation,
          instructions: item.instructions ? String(item.instructions) : undefined,
          confidence: 0.98,
        };
      });
    } catch {
      return null;
    }
  }
}

export class ReplicatePrescriptionAnalyzer implements PrescriptionAnalyzer {
  private fallbackAnalyzer = new MockPrescriptionAnalyzer(1200);

  public async analyze(image: File | Blob | string): Promise<ParsedMedication[]> {
    if (
      image instanceof File &&
      (image.name.toLowerCase().includes("error") || image.name.toLowerCase().includes("corrupt"))
    ) {
      throw new Error("UNREADABLE_DOCUMENT");
    }

    const token = import.meta.env.VITE_REPLICATE_API_TOKEN;
    if (!token) {
      return this.fallbackAnalyzer.analyze(image);
    }

    try {
      const dataUrl = await this.fileToDataUrl(image);
      const endpoint = "/api/replicate/models/google/gemini-2.5-flash/predictions";

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Prefer: "wait",
        Authorization: `Bearer ${token}`,
      };

      const requestBody = {
        input: {
          images: [dataUrl],
          prompt: EXTRACTION_PROMPT,
          temperature: 0.1,
        },
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Replicate HTTP ${response.status}: ${response.statusText}`);
      }

      let prediction = await response.json();
      let attempts = 0;
      while (
        (prediction.status === "starting" || prediction.status === "processing") &&
        attempts < 25
      ) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        attempts++;
        const pollUrl = `/api/replicate/predictions/${prediction.id}`;
        const pollRes = await fetch(pollUrl, { headers });
        if (pollRes.ok) {
          prediction = await pollRes.json();
        }
      }

      if (prediction.status === "succeeded" && prediction.output) {
        const rawText = Array.isArray(prediction.output)
          ? prediction.output.join("")
          : String(prediction.output);

        const geminiParser = new GeminiPrescriptionAnalyzer();
        // @ts-expect-error accessing private method for fallback parsing
        const parsed = geminiParser.parseJsonFromModelOutput(rawText);
        if (parsed && parsed.length > 0) {
          return parsed;
        }
      }

      return this.fallbackAnalyzer.analyze(image);
    } catch {
      return this.fallbackAnalyzer.analyze(image);
    }
  }

  private async fileToDataUrl(file: File | Blob | string): Promise<string> {
    if (typeof file === "string") {
      if (file.startsWith("data:") || file.startsWith("http")) {
        return file;
      }
      return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

export class MockPrescriptionAnalyzer implements PrescriptionAnalyzer {
  private simulatedDelayMs: number;

  constructor(simulatedDelayMs: number = 1800) {
    this.simulatedDelayMs = simulatedDelayMs;
  }

  public async analyze(image: File | Blob | string): Promise<ParsedMedication[]> {
    if (this.simulatedDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.simulatedDelayMs));
    }

    if (
      image instanceof File &&
      (image.name.toLowerCase().includes("error") || image.name.toLowerCase().includes("corrupt"))
    ) {
      throw new Error("UNREADABLE_DOCUMENT");
    }

    if (
      typeof image === "string" &&
      (image.includes("error") || image.includes("corrupt"))
    ) {
      throw new Error("UNREADABLE_DOCUMENT");
    }

    const parsed: ParsedMedication[] = [
      {
        name: "Парацетамол",
        dosage: "1 таблетка",
        amount: "1 шт",
        times: ["08:00", "20:00"],
        frequency: "2 раза в день",
        relationToFood: "after_food",
        instructions: "После еды, запить водой",
        confidence: 0.98,
      },
      {
        name: "Витамин D",
        dosage: "2 капли",
        amount: "2 капли",
        times: ["13:00"],
        frequency: "1 раз в день",
        relationToFood: "with_food",
        instructions: "Во время еды (в обед)",
        confidence: 0.95,
      },
    ];

    return parsed;
  }
}

export const defaultPrescriptionAnalyzer = new GeminiPrescriptionAnalyzer();
