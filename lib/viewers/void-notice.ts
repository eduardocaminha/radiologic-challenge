import { SITE_URL } from "@/lib/seo";

export interface VoteVoidNotice {
  name: string;
  slug: string;
  lang: string | null;
  votes: number;
  reasons: string[];
}

const COPY = {
  pt: {
    subject: "Votos anulados em {name}",
    body: "A verificação da votação anulou votos do projeto {name}.",
    votes: "Votos anulados",
    reason: "Motivo",
    appeal: "Para contestar, responda a este e-mail em até 15 dias.",
  },
  en: {
    subject: "Votes voided on {name}",
    body: "The voting review voided votes on your project {name}.",
    votes: "Voided votes",
    reason: "Reason",
    appeal: "To appeal, reply to this email within 15 days.",
  },
  es: {
    subject: "Votos anulados en {name}",
    body: "La revisión de la votación anuló votos del proyecto {name}.",
    votes: "Votos anulados",
    reason: "Motivo",
    appeal: "Para impugnar, responde a este correo en un plazo de 15 días.",
  },
};

// Só texto: nome e motivo chegam sem escape, e HTML não acrescenta nada aqui.
export function voteVoidEmail(notice: VoteVoidNotice) {
  const locale = notice.lang === "en" || notice.lang === "es" ? notice.lang : "pt";
  const copy = COPY[locale];
  return {
    subject: copy.subject.replace("{name}", notice.name),
    text: [
      copy.body.replace("{name}", notice.name),
      "",
      `${copy.votes}: ${notice.votes}`,
      `${copy.reason}: ${notice.reasons.join("; ")}`,
      "",
      copy.appeal,
      "",
      `${SITE_URL}/${locale}/v/${notice.slug}`,
    ].join("\n"),
  };
}
