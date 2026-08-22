# Araştırma → uygulama eşlemesi

Ispatla iki araştırma belgesini değişmeden korur:

- `../x-algorithm-news-account-analysis.md`: açık X algoritması sinyalleri,
  haber hesabı operasyonu ve ölçüm sınırları.
- `../xpatla-site-algoritma-arastirmasi-2026-08-21.md`: tarihsel XPatla ürün
  döngüsünün kamuya açık kanıta dayalı rekonstrüksiyonu.

| Araştırma yüzeyi | Ispatla karşılığı |
|---|---|
| FxTwitter source intake | `src/server/pipeline.ts` |
| Quote/reply/mention kaynak grafiği | `extractDiscoveryEvidence()` + `scoreSources()` |
| Provenance, media ve run evidence | `src/server/db.ts` |
| Fırsat listesi, heuristic bekleme ve hybrid yayın adayı | `getOpportunityItems()` + `/opportunities` (`/market` alias) |
| Hibrit Market/fırsat skoru | `hybridOpportunityScore()` in `src/server/scoring.ts` + `src/server/ai.ts` (OpenAI API veya Codex provider) |
| Market freshness ve velocity alanları | `toMarketItem()` in `src/server/db.ts` |
| Event/konu tekrarını azaltma | `clusterKey()` in `src/server/scoring.ts` |
| Stil bağlamı ve özgün Türkçe metin | `generateDraft()` + `generateManualDraft()` in `src/server/pipeline.ts` |
| Manuel post, çoklu hesap batch ve hesap başına varyant | `src/server/manual-drafts.ts` + `/drafts` + `/api/drafts/manual` |
| Format kredi/usage ledger | `usage_events` in `src/server/db.ts` + `/api/usage` |
| Quality, uncertainty ve rights gate | `qualityGate()` + `downloadMedia()` |
| x-use MCP queue + publish receipt + reconciliation | `src/server/xuse.ts` + `src/server/queue-service.ts` + `publishCandidate()` + `reconcilePending()` |
| SSR dashboard + Recharts graph | `src/components/dashboard.tsx` |
| Five-minute independent scheduler | `src/instrumentation.ts` |
| Hesap list/edit ve account style context | `src/server/db.ts` + `/accounts` |
| Secret key edit ve server-side vault | `src/server/vault.ts` + `/settings/keys` |
| Fırsatlar, draft studio ve job queue | `/opportunities` (`/market` alias), `/drafts`, `/queue` |
| Doğal dil command desk ve onaylı mutation | `src/server/chat.ts` + `/api/chat` + `src/components/chat-panel.tsx` |
| x-use runtime/capability discovery | `src/server/xuse.ts` + `/settings/automation` |

## Kesinlik sınırı

Phoenix, VMRanker, DPP, visibility filter ve XPatla Market için açık kaynakta
görülen fikirler aday sıralamasına ve kalite gate’lerine ilham verir. X’in özel
model ağırlıkları, XPatla’nın kapalı puan formülü, özel prompt’ları ve geçmiş
otomasyon kuyruğu bu projede gerçekmiş gibi gösterilmez. Sonuçlar `confirmed`,
`inferred` veya `unknown` sınırlarıyla değerlendirilir.

Kaynak ve post skorları X skoru değildir. Deterministik freshness/velocity
girdileri, Luna medium editoryal değerlendirmesi ve gerekli olduğunda Terra
ikinci görüşüyle oluşturulan Ispatla tahminidir. Model veya schema cevabı
başarısızsa kaynak terfisi, otomatik silme ve post yayın adaylığı fail-closed
kalır.

## Otomatik yayın sözleşmesi

İçerik intake ve yayın birbirinden ayrıdır. `x-use` yalnızca local olarak
validated media yollarını alır; tarayıcı toast’ı veya x-use stdout’u uzak
başarı kanıtı değildir. Yeni post FxTwitter üzerinden aynı metin ve yazar ile
bulunana kadar `pending_reconciliation` kalır; medya eşleşmesi bu kanıtın
parçası değildir. Reply, quote ve DM için
ürün formatları ve draft kayıtları vardır; güvenilir MCP queue sözleşmesi olmayan
aksiyonlar çalıştırılmaz. Follow, like ve büyüme otomasyonu için sahte başarı
veya doğrudan browser bypass’ı yoktur.
