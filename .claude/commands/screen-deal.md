# AI Deal Screening

Run a comprehensive AI screening analysis on a deal document (CIM, teaser, pitch deck, or memo).

**Input**: $ARGUMENTS (a file path to the document, or a deal name to look up)

## What This Does

This simulates what your AI screening engine does, but directly in Claude — giving you a richer, more interactive analysis than the automated version in the app.

## Analysis Framework

Analyze the document across these dimensions:

### 1. Deal Basics (extract)
- Company/asset name, sector, geography
- Deal size, capital instrument (debt vs equity), participation structure
- Sponsor/counterparty, vintage year

### 2. Financial Metrics (extract & calculate)
- Revenue, EBITDA, margins, growth rate
- Valuation multiples (EV/EBITDA, P/E, cap rate for RE)
- Leverage ratios (debt/EBITDA, LTV for RE)
- Cash flow yield, coverage ratios

### 3. Risk Flags (identify)
Rate each risk HIGH / MEDIUM / LOW:
- Customer/tenant concentration
- Regulatory/compliance exposure
- Market cyclicality
- Management/key-person dependency
- Capital structure complexity
- ESG/environmental risks

### 4. Investment Thesis Assessment
- Bull case (what goes right)
- Base case (expected outcome)
- Bear case (what goes wrong)
- Key assumptions that must hold

### 5. Screening Score (0-100)
- Weight: Financials 30%, Market Position 20%, Risk Profile 25%, Management 15%, Structure 10%
- Provide the weighted score with justification

### 6. Recommendation
- PROCEED / PROCEED WITH CONDITIONS / PASS
- If PROCEED: what DD workstreams to prioritize
- If PASS: clear reason why

## Output Format
Present results as a structured report I can reference during IC discussions. Use tables for financials and risks. Bold the key numbers. End with a 3-sentence executive summary.
