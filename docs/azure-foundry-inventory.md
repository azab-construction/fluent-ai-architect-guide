# Azure / Microsoft Foundry Inventory

This file records the Foundry resources currently observed from the production screenshots. It is intentionally descriptive only; secrets, keys, and real endpoint URLs must remain in server-side runtime secrets.

## Foundry resources

| Resource / project | Type | Region | Notes |
|---|---|---|---|
| az-vision | Project | eastus2 | Linked to `alazab-ai-resource`; contains `gpt-5.5` and `az-vision-agent`. |
| az-products | Project | eastus2 | Linked to `az-products-resource`. |
| az-ai-gateway | Project | eastus2 | Linked to `az-ai-resource`; intended as gateway/project layer. |
| az-finance-resource | AI Foundry | swedencentral | Contains `az-finance` model (`gpt-5.1`), `gpt-4.1`, and `az-agent-maint`. |
| azab-ai-resource | AI Foundry | eastus | Contains `Azure-Speech-Voice-Live` and `az-agent-prod`. |

## Chat model routing

The app sends a model id to the Supabase Edge function. The Edge runtime resolves the actual Azure deployment through secrets.

Current model ids used by the UI:

- `gpt-5.5`
- `gpt-5.1`
- `gpt-4.1`
- `gpt-4o` as optional fallback only

Recommended runtime mapping example:

```env
AZURE_OPENAI_DEPLOYMENTS_JSON={"gpt-5.5":{"deployment":"gpt-5.5","apiVersion":"2026-04-24"},"gpt-5.1":{"deployment":"az-finance"},"gpt-4.1":{"deployment":"gpt-4.1"}}
```

Use the exact deployment names shown by **Get code** or the deployment details page. Do not assume that the display name is always the deployment name.

## Agents observed

| Agent | Source | Preferred model id |
|---|---|---|
| az-vision-agent | az-vision | gpt-5.5 |
| az-agent-maint | az-finance-resource | gpt-5.1 |
| az-agent-prod | azab-ai-resource | gpt-5.1 until a dedicated production deployment is confirmed |

## Speech model

`Azure-Speech-Voice-Live` is a realtime/speech model and must not be sent to the Chat Completions proxy. It needs a separate realtime voice integration path.

Placeholder secrets:

```env
AZURE_SPEECH_VOICE_LIVE_ENDPOINT=
AZURE_SPEECH_VOICE_LIVE_KEY=
AZURE_SPEECH_VOICE_LIVE_MODEL=Azure-Speech-Voice-Live
```
