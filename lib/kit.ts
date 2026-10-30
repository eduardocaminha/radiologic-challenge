import kit from "@/content/kit.json";

export interface KitStudy {
  collection: string;
  collection_id: string;
  modality: string[];
  body_part: string;
  study_instance_uid: string;
  license: string;
  size_mb: number;
  citation: string[];
  download: string;
  patient_id?: string;
  study_date?: string;
}

export interface Kit {
  source: string;
  idc_index_version: string;
  install: string;
  download_all: string;
  idc_citation: string;
  studies: KitStudy[];
}

export const KIT: Kit = kit;

const DAY_MS = 86_400_000;

// Datas do IDC são deslocadas pela desidentificação: só o intervalo entre exames do mesmo paciente é real.
export function daysSincePrior(study: KitStudy): number | null {
  if (!study.patient_id || !study.study_date) return null;
  const current = Date.parse(study.study_date);
  const priors = KIT.studies
    .filter((other) => other.patient_id === study.patient_id && other.study_date && Date.parse(other.study_date) < current)
    .map((other) => Date.parse(other.study_date as string));
  return priors.length ? Math.round((current - Math.max(...priors)) / DAY_MS) : null;
}

export const KIT_TOTAL_MB = KIT.studies.reduce((total, study) => total + study.size_mb, 0);

export function primaryModality(study: KitStudy) {
  return study.modality.filter((value) => !["SEG", "SR", "M3D"].includes(value)).join("/");
}

