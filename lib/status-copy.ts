import type { Locale } from "@/lib/i18n";

// Telas de erro renderizam fora do fluxo normal de dados, então a copy não passa pelos dicionários.
export const STATUS_COPY: Record<Locale, { notFound: string; error: string; back: string; retry: string; nonClinical: string }> = {
  pt: { notFound: "Esta série não está na pilha", error: "O estudo não carregou", back: "Voltar para a galeria", retry: "Tentar de novo", nonClinical: "Uso não clínico" },
  en: { notFound: "This series is not in the worklist", error: "The study did not load", back: "Back to the gallery", retry: "Try again", nonClinical: "Non-clinical use" },
  es: { notFound: "Esta serie no está en la pila", error: "El estudio no cargó", back: "Volver a la galería", retry: "Intentar de nuevo", nonClinical: "Uso no clínico" },
};
