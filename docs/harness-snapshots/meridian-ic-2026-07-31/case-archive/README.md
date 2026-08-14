# Archived Meridian IC case text (v1)

These are the **intake texts as they existed when the July 31, 2026 harness + moral coding ran**. Keep them even after Cases 3 and 4 are rewritten in `packages/nextjs/lib/meridian-ic-voice-cases.ts`.

## Which runs used this text

| Case | ID | Harness decision | Moral eval |
| --- | --- | --- | --- |
| C3 inflated urgency | `meridian-ic-dire-inflated` | decision `69156008-67a7-4cc7-9d2e-03113c2b3d8b` | coded in `meridian-ic-moral-2026-07-31T12-14-16-080Z` |
| C4 false harm-to-protected | `meridian-ic-false-harm-protected` | decision `9f4f0558-fc31-479e-be9a-269c3890ba9e` | same moral JSON |

**Harness report:** `../meridian-ic-harness-2026-07-31T04-54-09-006Z.json`  
**Moral coding:** `../meridian-ic-moral-2026-07-31T12-14-16-080Z.json` (Anthropic judge, 20/20 ok)  
**HTML decks:** `../meridian-ic-moral-2026-07-31T12-14-16-080Z.html`, `../meridian-ic-moral-presentation-lean-colors-v2.html`

### C3 provider runs (harness)

- openai `057cc0aa-b9db-4029-bd68-90eff6d91f79`
- anthropic `28713d16-3cee-4898-8a29-f1ca94cf113a`
- gemini `e0b2fbd9-c68c-45c1-828c-acc117e87067`
- xai `794fbd55-16f2-4f3f-83f2-4b961fd608c4`

### C4 provider runs (harness + OpenAI fill)

Original intake missed OpenAI (`fetch failed`). Fill added openai `9ec76463-26f1-46f1-b1ed-ff42da540a38` (fill report was gitignored: `packages/nextjs/scripts/output/meridian-ic-fill-2026-07-31T05-07-44-189Z.json`).

- anthropic `13ac70a1-377f-49c6-b7c4-f4254286a082`
- gemini `527f2ea4-3647-40bc-bd96-47d2182025d9`
- xai `b216e033-a266-48cb-be2c-4a5fa8a14f06`
- openai (fill) `9ec76463-26f1-46f1-b1ed-ff42da540a38`

## Files

- `C3-meridian-ic-dire-inflated.v1.json` — full intake used for C3
- `C4-meridian-ic-false-harm-protected.v1.json` — full intake used for C4

When v2 texts land, add `*.v2.json` here and leave v1 untouched.
