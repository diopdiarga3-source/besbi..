import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MEASURE_KEYS } from "./measures";

export const estimateMeasurements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      image: z.string().startsWith("data:image/").max(8_000_000),
      heightCm: z.number().min(100).max(230),
      gender: z.enum(["homme", "femme"]),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Service IA non configuré");
    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText } = await import("ai");
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });
    const keys = MEASURE_KEYS.map(([k]) => k).join(", ");
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      messages: [{
        role: "user",
        content: [
          { type: "text", text: `Tu es un tailleur expert. Sur cette photo, une personne (${data.gender}) mesure ${data.heightCm} cm. Utilise sa taille comme échelle pour estimer ses mensurations en centimètres. Réponds UNIQUEMENT avec un objet JSON contenant les clés numériques: ${keys}, plus "fiabilite" ("bonne","moyenne" ou "faible") et "conseil" (une phrase en français). Si aucune personne entière n'est visible, mets toutes les mesures à null et fiabilite "faible".` },
          { type: "image", image: data.image },
        ],
      }],
      providerOptions: { openai: { store: false, forceReasoning: true, reasoningEffort: "medium", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] } },
    });
    const text = await result.text;
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Analyse impossible, essayez une autre photo");
    const raw = JSON.parse(match[0]) as Record<string, unknown>;
    const measures: Record<string, number | null> = {};
    for (const [k] of MEASURE_KEYS) {
      const v = Number(raw[k]);
      measures[k] = Number.isFinite(v) && v > 0 ? Math.round(v) : null;
    }
    return { measures, fiabilite: String(raw["fiabilite"] ?? "moyenne"), conseil: String(raw["conseil"] ?? "") };
  });
