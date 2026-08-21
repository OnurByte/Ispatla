# Araştırma → uygulama eşlemesi

Ispatla iki araştırma belgesini değişmeden korur:

- `../x-algorithm-news-account-analysis.md`: açık X algoritması sinyalleri,
  haber hesabı operasyonu ve ölçüm sınırları.
- `../xpatla-site-algoritma-arastirmasi-2026-08-21.md`: tarihsel XPatla ürün
  döngüsünün kamuya açık kanıta dayalı rekonstrüksiyonu.

| Araştırma yüzeyi | Ispatla karşılığı |
|---|---|
| FxTwitter source intake | `src/server/pipeline.ts` |
| Provenance, media ve run evidence | `src/server/db.ts` |
| Market/fırsat, freshness ve velocity | `src/server/scoring.ts` |
| Event/konu tekrarını azaltma | `clusterKey()` in `src/server/scoring.ts` |
| Stil bağlamı ve özgün Türkçe metin | `generateDraft()` in `src/server/pipeline.ts` |
| Quality, uncertainty ve rights gate | `qualityGate()` + `downloadMedia()` |
| x-use publish receipt + reconciliation | `publishCandidate()` + `reconcilePending()` |
| SSR dashboard + Recharts graph | `src/components/dashboard.tsx` |
| Five-minute independent scheduler | `src/instrumentation.ts` |

## Kesinlik sınırı

Phoenix, VMRanker, DPP, visibility filter ve XPatla Market için açık kaynakta
görülen fikirler aday sıralamasına ve kalite gate’lerine ilham verir. X’in özel
model ağırlıkları, XPatla’nın kapalı puan formülü, özel prompt’ları ve geçmiş
otomasyon kuyruğu bu projede gerçekmiş gibi gösterilmez. Sonuçlar `confirmed`,
`inferred` veya `unknown` sınırlarıyla değerlendirilir.

## Otomatik yayın sözleşmesi

İçerik intake ve yayın birbirinden ayrıdır. `x-use` yalnızca local olarak
validated media yollarını alır; tarayıcı toast’ı veya x-use stdout’u uzak
başarı kanıtı değildir. Yeni post FxTwitter üzerinden aynı metin, yazar ve
medya ile bulunana kadar `pending_reconciliation` kalır. Reply, quote, DM,
follow, like ve büyüme otomasyonu bu projeye dahil değildir.
