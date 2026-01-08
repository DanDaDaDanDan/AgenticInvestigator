# Journalistic Integrity Check (Orchestrator Mode)

You are the **orchestrator**. You dispatch integrity analysis agents — you do NOT run analysis directly.

---

## Usage

```
/integrity              # Review active case
/integrity [case-id]    # Review specific case
```

---

## Core Standards

The model knows journalism ethics (SPJ Code). Key checks:

| Standard | Definition | Red Flags |
|----------|------------|-----------|
| Balance | All significant viewpoints represented | One-sided sourcing |
| Fairness | Proportional coverage | Asymmetric scrutiny |
| Objectivity | Facts separated from opinion | Editorializing |
| Impartiality | No favoritism | Loaded language |

---

## Orchestrator Flow

```
1. READ: _state.json
2. DISPATCH: Integrity analysis agents (parallel)
3. WAIT: Agents write to integrity-check.md
4. REPORT: Overall rating
```

---

## Dispatch Agents (parallel, ONE message)

```
Task 1: Balance analysis (source distribution by position)
Task 2: Language neutrality (scan for loaded/biased language)
Task 3: Adversarial review (how would each criticized party object?)
Task 4: Steelmanning check (is strongest version of each position presented?)
```

### Agent Prompt Template

```
Task tool:
  subagent_type: "general-purpose"
  description: "[Analysis type] for integrity check"
  prompt: |
    TASK: [Analysis type]
    CASE: cases/[case-id]/

    Read summary.md, positions.md, sources.md.

    Apply journalism ethics standards.

    Write to integrity-check.md.

    RETURN: Verdict, issue count
```

---

## Output Format

```markdown
# Journalistic Integrity Assessment: [Title]

**Case**: [case-id]
**Overall Rating**: [EXEMPLARY | GOOD | ADEQUATE | NEEDS IMPROVEMENT | BIASED]

## Executive Summary
[Balance assessment, concerns, strengths, improvements needed]

## Source Balance
| Position | Sources | % | Assessment |

## Language Audit
| Location | Original | Issue | Suggested Revision |

## Scrutiny Symmetry
| Entity | Scrutiny Level | Evidence |

## Steelmanning
| Position | Strongest Arguments Present | Strawmanning Avoided |

## Required Corrections
### Must Fix
### Recommended

## Integrity Checklist
- [ ] All positions represented proportionally
- [ ] Language neutral throughout
- [ ] Scrutiny applied equally
- [ ] Facts separated from analysis
- [ ] Strongest version of each argument presented
- [ ] Exculpatory evidence included

**Publication Readiness (Integrity)**: [READY | READY WITH CHANGES | NOT READY]
```
