import { GoogleGenAI, Type } from "@google/genai";

const DEFAULT_MODELS = ["gemini-1.5-flash", "gemini-2.5-flash", "gemini-2.0-flash"];

type GenerateResponse = Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>;

const getFirstNonEmpty = (values: Array<string | undefined>): string | undefined => {
  for (const value of values) {
    const trimmed = value?.trim().replace(/^['\"]|['\"]$/g, "");
    if (trimmed) {
      return trimmed;
    }
  }
  return undefined;
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

function getClient() {
  const viteEnv = (import.meta.env ?? {}) as Record<string, string | undefined>;
  const processEnv = typeof process !== "undefined" ? process.env : {};

  const apiKey = getFirstNonEmpty([
    viteEnv.VITE_GEMINI_API_KEY,
    viteEnv.VITE_GOOGLE_API_KEY,
    viteEnv.VITE_API_KEY,
    viteEnv.VITE_API_ID,
    processEnv.GEMINI_API_KEY,
    processEnv.GOOGLE_API_KEY,
    processEnv.API_KEY,
    processEnv.API_ID,
  ]);

  if (!apiKey) {
    throw new Error("Missing API key. Set VITE_GEMINI_API_KEY in .env and restart the dev server.");
  }

  if (!apiKey.startsWith("AIza")) {
    throw new Error(
      "Invalid Gemini API key format. Use an API key from Google AI Studio (usually starts with 'AIza'), not an API/project ID."
    );
  }

  return new GoogleGenAI({ apiKey });
}

export interface VerificationResult {
  verdict: "Real" | "Fake" | "Misleading" | "Unverified";
  aiProbability: number;
  summary: string;
  detailedAnalysis: string[];
  sources: { title: string; url: string }[];
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    verdict: {
      type: Type.STRING,
      description: "One of: Real, Fake, Misleading, Unverified.",
    },
    aiProbability: {
      type: Type.NUMBER,
      description: "0-100 probability the content appears AI-generated or manipulated.",
    },
    summary: {
      type: Type.STRING,
      description: "Brief factual summary of verification outcome.",
    },
    detailedAnalysis: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Concise bullet points with claim checks and evidence rationale.",
    },
    sources: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          url: { type: Type.STRING },
        },
        required: ["title", "url"],
      },
      description: "Credible source links used in verification.",
    },
  },
  required: ["verdict", "aiProbability", "summary", "detailedAnalysis", "sources"],
};

const SYSTEM_INSTRUCTION = `You are an expert fact-checker and digital forensics analyst.
Your goal is high factual accuracy.

Rules:
1. Break input into core verifiable claims.
2. Verify each claim with Google Search results and prefer primary/authoritative sources (official statements, major wire services, peer-reviewed/government data).
3. Penalize low-quality or non-authoritative sources.
4. Distinguish between false, misleading (partly true/out-of-context), and unverified (insufficient evidence).
5. For image claims, include OCR/readability issues and visual manipulation indicators.
6. Assign aiProbability (0-100) only from concrete indicators, not guesswork.
7. Return ONE JSON object matching schema exactly.`;

const clampProbability = (value: unknown): number => {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
};

const normalizeVerdict = (value: unknown): VerificationResult["verdict"] => {
  if (value === "Real" || value === "Fake" || value === "Misleading" || value === "Unverified") {
    return value;
  }
  return "Unverified";
};

const normalizeSources = (value: unknown): { title: string; url: string }[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: { title: string; url: string }[] = [];

  for (const item of value) {
    const title = typeof (item as any)?.title === "string" ? (item as any).title.trim() : "";
    const url = typeof (item as any)?.url === "string" ? (item as any).url.trim() : "";
    if (!title || !url) continue;
    if (!/^https?:\/\//i.test(url)) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ title, url });
  }

  return out;
};

const normalizeResult = (raw: any): VerificationResult => {
  const detailedAnalysis = Array.isArray(raw?.detailedAnalysis)
    ? raw.detailedAnalysis.filter((x: unknown) => typeof x === "string").map((x: string) => x.trim()).filter(Boolean)
    : [];

  return {
    verdict: normalizeVerdict(raw?.verdict),
    aiProbability: clampProbability(raw?.aiProbability),
    summary: typeof raw?.summary === "string" && raw.summary.trim() ? raw.summary.trim() : "No summary provided.",
    detailedAnalysis,
    sources: normalizeSources(raw?.sources),
  };
};

const parseJsonFromText = (resultText: string): VerificationResult | null => {
  const cleaned = resultText.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();

  let rawObj: any = null;

  try {
    rawObj = JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        rawObj = JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    } else {
      return null;
    }
  }

  const normalized = normalizeResult(rawObj);
  
  // If we got basically nothing back (silent failure disguised as default "Unverified"), return null to trigger repair
  if (normalized.detailedAnalysis.length === 0 && normalized.summary === "No summary provided.") {
    return null;
  }

  return normalized;
};

const isModelNameError = (error: unknown): boolean => {
  const message = toErrorMessage(error).toLowerCase();
  return (
    message.includes("model") &&
    (message.includes("not found") ||
      message.includes("unsupported") ||
      message.includes("not available") ||
      message.includes("unknown"))
  );
};

const runAnalysis = async (
  ai: GoogleGenAI,
  model: string,
  parts: any[]
): Promise<GenerateResponse> => {
  return ai.models.generateContent({
    model,
    contents: { parts },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ googleSearch: {} }],
      responseSchema: RESPONSE_SCHEMA,
    },
  });
};

const runJsonRepair = async (
  ai: GoogleGenAI,
  model: string,
  rawText: string
): Promise<VerificationResult | null> => {
  const repairPrompt = `Convert the following model output into a single valid JSON object that matches the target schema exactly. Do not add markdown fences.\n\nOutput to convert:\n${rawText}`;

  const response = await ai.models.generateContent({
    model,
    contents: repairPrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  if (!response.text) return null;
  return parseJsonFromText(response.text);
};

export async function verifyContent(
  text: string,
  image?: { data: string; mimeType: string }
): Promise<VerificationResult> {
  try {
    const parts: any[] = [];

    if (image) {
      parts.push({
        inlineData: {
          data: image.data,
          mimeType: image.mimeType,
        },
      });
    }

    if (text.trim()) {
      parts.push({ text: `Additional Context/Text:\n"""\n${text}\n"""` });
    }

    if (parts.length === 0) {
      throw new Error("Please provide either text or an image to verify.");
    }

    parts.push({
      text: `Fact-check this content with web grounding. Include concise claim-level evidence in detailedAnalysis and return schema-compliant JSON only.`,
    });

    const ai = getClient();
    const modelFromEnv = getFirstNonEmpty([
      ((import.meta.env ?? {}) as Record<string, string | undefined>).VITE_GEMINI_MODEL,
      typeof process !== "undefined" ? process.env.GEMINI_MODEL : undefined,
    ]);
    const modelsToTry = [...new Set([modelFromEnv, ...DEFAULT_MODELS].filter(Boolean) as string[])];

    let response: GenerateResponse | null = null;
    let usedModel = "";
    let lastModelError: unknown = null;

    for (const modelName of modelsToTry) {
      try {
        response = await runAnalysis(ai, modelName, parts);
        usedModel = modelName;
        break;
      } catch (error) {
        if (
          isModelNameError(error) ||
          toErrorMessage(error).includes("429") ||
          toErrorMessage(error).toLowerCase().includes("quota")
        ) {
          lastModelError = error;
          continue;
        }
        throw error;
      }
    }

    if (!response) {
      throw new Error(
        `None of the configured Gemini models worked (${modelsToTry.join(", ")}). ${
          lastModelError ? toErrorMessage(lastModelError) : ""
        }`.trim()
      );
    }

    const rawText = response.text ?? "";
    let parsed = parseJsonFromText(rawText);

    if (!parsed && usedModel) {
      try {
        parsed = await runJsonRepair(ai, usedModel, rawText);
      } catch (repairError) {
        console.error("JSON repair failed:", repairError);
      }
    }

    if (!parsed) {
      throw new Error("Failed to parse the AI response. Please retry.");
    }

    if (parsed.sources.length === 0 && response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      const chunks = response.candidates[0].groundingMetadata.groundingChunks;
      const extractedSources: { title: string; url: string }[] = [];
      const seen = new Set<string>();

      for (const chunk of chunks) {
        const url = chunk.web?.uri;
        const title = chunk.web?.title;
        if (!url || !title || seen.has(url)) continue;
        if (!/^https?:\/\//i.test(url)) continue;
        seen.add(url);
        extractedSources.push({ title, url });
      }

      if (extractedSources.length > 0) {
        parsed.sources = extractedSources;
      }
    }

    return parsed;
  } catch (error: unknown) {
    console.error("Error verifying content:", error);
    const message = toErrorMessage(error);
    const lower = message.toLowerCase();

    if (message.includes("429") || lower.includes("resource_exhausted") || lower.includes("quota")) {
      throw new Error("API quota/rate limit exceeded. Check Gemini quota/billing and retry shortly.");
    }

    if (message.includes("401") || lower.includes("unauthorized")) {
      throw new Error("Authentication failed. Check your Gemini API key in .env and restart the dev server.");
    }

    if (message.includes("400") || lower.includes("invalid_argument")) {
      throw new Error("Invalid request sent to Gemini. Please restart the app and try again.");
    }

    if (lower.includes("failed to fetch") || lower.includes("networkerror")) {
      throw new Error("Network request failed. Check internet, VPN/proxy, ad-block rules, and key restrictions for localhost.");
    }

    throw new Error(message || "Failed to verify the content. Please try again.");
  }
}