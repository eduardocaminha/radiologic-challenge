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
}

export interface Kit {
  source: string;
  idc_index_version: string;
  install: string;
  idc_citation: string;
  studies: KitStudy[];
}

export const KIT: Kit = kit;
