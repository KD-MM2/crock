## ADDED Requirements

### Requirement: NATO word list generation
`generateCodePhrase()` SHALL produce a string in the format `<word>-<2-digit-number>-<word>` using words from a 26-word NATO phonetic alphabet list and a random number between 10 and 99.

#### Scenario: Generate code phrase
- **WHEN** `generateCodePhrase()` is called
- **THEN** it returns a string matching `/^[a-z]+-\d{2}-[a-z]+$/`

### Requirement: Randomization
Each call to `generateCodePhrase()` SHALL produce a different code phrase with high probability, selecting words and numbers independently at random.

#### Scenario: Two consecutive calls
- **WHEN** `generateCodePhrase()` is called twice
- **THEN** the two results are likely different
