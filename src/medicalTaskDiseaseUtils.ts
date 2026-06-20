export type MedicalDiseasePig = {
  id: string;
  area: string;
  pen: string;
  diseaseTags: string[];
  symptomTags: string[];
};

export type DiseaseCriteria = {
  diseases: string[];
  symptoms: string[];
};

export type MedicalTaskPigFilterCriteria = {
  penKeyword: string;
  diseases: string[];
  symptoms: string[];
  diagnosisStatuses: string[];
  idSearch: string;
};

function containsEvery(selected: string[], actual: string[]): boolean {
  return selected.every((tag) => actual.includes(tag));
}

function includesKeyword(value: string, keyword: string): boolean {
  return value.toLowerCase().includes(keyword.trim().toLowerCase());
}

export function hasStructuredMedicalTaskFilter(criteria: MedicalTaskPigFilterCriteria): boolean {
  return Boolean(
    criteria.penKeyword.trim() ||
      criteria.diseases.length ||
      criteria.symptoms.length ||
      criteria.diagnosisStatuses.length
  );
}

export function filterPigsByDiseaseCriteria(
  pigs: MedicalDiseasePig[],
  criteria: DiseaseCriteria
): MedicalDiseasePig[] {
  return pigs.filter((pig) => {
    const diseaseMatched =
      criteria.diseases.length === 0 || criteria.diseases.some((tag) => pig.diseaseTags.includes(tag));
    const symptomMatched =
      criteria.symptoms.length === 0 || containsEvery(criteria.symptoms, pig.symptomTags);

    return diseaseMatched && symptomMatched;
  });
}

export function filterPigsByMedicalTaskCriteria<T extends MedicalDiseasePig & { diagnosisStatus: string }>(
  pigs: T[],
  criteria: MedicalTaskPigFilterCriteria
): T[] {
  if (!hasStructuredMedicalTaskFilter(criteria)) return [];

  return pigs.filter((pig) => {
    const penMatched =
      !criteria.penKeyword.trim() ||
      includesKeyword(pig.pen, criteria.penKeyword) ||
      includesKeyword(pig.area, criteria.penKeyword);
    const diseaseMatched =
      criteria.diseases.length === 0 || criteria.diseases.some((tag) => pig.diseaseTags.includes(tag));
    const symptomMatched =
      criteria.symptoms.length === 0 || containsEvery(criteria.symptoms, pig.symptomTags);
    const statusMatched =
      criteria.diagnosisStatuses.length === 0 || criteria.diagnosisStatuses.includes(pig.diagnosisStatus);
    const idMatched = !criteria.idSearch.trim() || includesKeyword(pig.id, criteria.idSearch);

    return penMatched && diseaseMatched && symptomMatched && statusMatched && idMatched;
  });
}
