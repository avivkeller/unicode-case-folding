import * as cldr from "@internal/build/sources/cldr";

export const VERSION = await cldr.version();

const { region, fractions } = (
  await cldr.json("cldr-core", "supplemental/currencyData.json")
).supplemental.currencyData;

export const REGION_CURRENCIES = new Map(
  Object.entries(region).map(([code, list]) => [
    code,
    list
      .flatMap((entry) => Object.entries(entry))
      .filter(([, info]) => info._tender !== "false")
      .map(([currency, info]) => [
        currency,
        info._from ?? null,
        info._to ?? null,
      ]),
  ]),
);

export const CURRENCY_ROUNDING = new Map(
  Object.entries(fractions).map(([code, fraction]) => {
    const digits = Number(fraction._digits);
    const rounding = Number(fraction._rounding) || 1;
    return [
      code,
      [
        digits,
        rounding,
        Number(fraction._cashDigits ?? digits),
        Number(fraction._cashRounding ?? rounding) || 1,
      ],
    ];
  }),
);

const defaults = JSON.stringify(CURRENCY_ROUNDING.get("DEFAULT"));
for (const [code, rounding] of CURRENCY_ROUNDING) {
  if (code !== "DEFAULT" && JSON.stringify(rounding) === defaults) {
    CURRENCY_ROUNDING.delete(code);
  }
}
