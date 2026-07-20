import { COUNTRIES } from "@/constants/countries";
import { item } from "@/domain/reference-data/catalog/financial";
import type { ReferenceDataItemInput } from "@/domain/reference-data/types";

export const COUNTRIES_CATALOG: ReferenceDataItemInput[] = COUNTRIES.map((c, index) =>
  item(c.code, c.name, {
    sortOrder: index + 1,
    searchTerms: c.name,
    metadata: { isoCode: c.code },
  })
);
