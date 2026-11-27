export function parseLineBreakTest(contents) {
  const cases = [];
  for (const line of contents.split("\n")) {
    const data = line.split("#")[0].trim();
    if (!data) continue;
    let text = "";
    const breaks = [];
    for (const token of data.split(/\s+/)) {
      if (token === "÷") breaks.push(text.length);
      else if (token !== "×") text += String.fromCodePoint(parseInt(token, 16));
    }
    cases.push({ line, text, breaks });
  }
  return cases;
}
