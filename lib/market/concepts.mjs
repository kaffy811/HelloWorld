export const concepts = [
  {
    key: "stock",
    term: "A stock",
    definition:
      "A share represents an ownership interest in a company. Understanding the business helps you understand what that ownership relates to.",
    question: "What does this company sell, and who pays for it?",
  },
  {
    key: "revenue-profit",
    term: "Revenue and profit",
    definition:
      "Revenue is money earned from selling goods or services, rather than necessarily cash received. Profit is what remains after the relevant costs and expenses. Revenue can grow while profit falls.",
    question: "Which costs could change alongside sales?",
  },
  {
    key: "margin",
    term: "Profit margin",
    definition:
      "A margin compares a measure of profit with revenue. Gross, operating and net margins include different costs. Check which margin a source is discussing.",
    question: "Is this a gross, operating or net margin?",
  },
  {
    key: "price-value",
    term: "Price and value",
    definition:
      "A stock price is a market transaction price. Estimating a company’s value requires assumptions about its business and future. Those assumptions can differ.",
    question: "What expectations might already be reflected in the price?",
  },
  {
    key: "market-order",
    term: "A market order",
    definition:
      "A market order prioritizes execution at available prices. The execution price can differ from the last price displayed, especially when prices move quickly.",
    question: "Is the displayed price an execution guarantee?",
  },
  {
    key: "limit-order",
    term: "A limit order",
    definition:
      "A limit order sets the maximum purchase price or minimum sale price you accept. It controls the price condition, but execution is not guaranteed.",
    question: "How do price control and execution differ?",
  },
  {
    key: "cash-flow",
    term: "Operating cash flow",
    definition:
      "Operating cash flow measures cash generated or used by operating activities during a period. It differs from net income because revenue and expenses may be recognized before or after cash moves.",
    question:
      "Is the company earning accounting profit, generating cash, or both?",
  },
  {
    key: "eps",
    term: "Diluted EPS",
    definition:
      "Diluted earnings per share allocates earnings to the weighted average share count, including potentially dilutive securities under accounting rules. Check the period and whether the figure is GAAP or adjusted.",
    question: "Are the EPS figures for comparable periods?",
  },
  {
    key: "annual-quarter",
    term: "10-K and 10-Q",
    definition:
      "A 10-K is an annual report. A 10-Q is a quarterly report for the first three fiscal quarters. A 10-Q can include both quarterly and year-to-date figures; those periods should not be mixed.",
    question:
      "Does this number cover three months, nine months, or a full year?",
  },
];
export function resolveBookmark(input, analysis) {
  if (input.concept) {
    const c = concepts.find((c) => c.key === input.concept);
    if (!c) throw new Error("Unknown concept");
    return {
      source_key: `concept:${c.key}`,
      kind: "concept",
      analysis_id: null,
      ticker: null,
      text: c.term,
      explanation: c.definition,
      source_url: "/learn#" + c.key,
      provenance: "Learning library",
    };
  }
  if (!analysis || !["news", "followup"].includes(analysis.kind))
    throw new Error("Explanation unavailable");
  const index = input.index;
  if (!Number.isInteger(index) || index < 0 || index > 100)
    throw new Error("Invalid selection");
  if (input.section === "terms") {
    const term = analysis.content.terms[index];
    if (!term) throw new Error("Invalid term");
    return {
      source_key: `${analysis.id}:terms:${index}`,
      kind: "term",
      analysis_id: analysis.id,
      ticker: analysis.ticker,
      text: term.term,
      explanation: term.definition,
      source_url: `/${analysis.kind === "news" ? "news" : "learning"}/${analysis.id}#key-ideas`,
      provenance: "AI explanation",
    };
  }
  if (!["facts", "impact", "upside", "downside"].includes(input.section))
    throw new Error("Invalid section");
  const claim = analysis.content[input.section]?.[index];
  if (!claim) throw new Error("Invalid sentence");
  const refs = new Set(claim.evidence_ids || []);
  const context = analysis.evidence
    .filter((e) => refs.has(e.id))
    .map((e) => e.label)
    .join("; ");
  return {
    source_key: `${analysis.id}:${input.section}:${index}`,
    kind: "sentence",
    analysis_id: analysis.id,
    ticker: analysis.ticker,
    text: claim.text,
    explanation: analysis.content.summary + "\n\nSource context: " + context,
    source_url: `/${analysis.kind === "news" ? "news" : "learning"}/${analysis.id}`,
    provenance: "AI explanation",
  };
}
