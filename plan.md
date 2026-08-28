# Ispatla — X-Only Otonom Hit Engine Planı

Bu belge Ispatla'nın bundan sonraki ürün yönünü tanımlar.

Ispatla'nın amacı bir haber sitesi veya yalnızca haber hesabı otomasyonu değildir. Orijinal XPatla fikrinin esas değeri **X üzerinde hit olabilecek içeriği erkenden bulmak, doğru hesaba doğru biçimde uyarlamak, doğru anda yayınlamak ve sonuçtan öğrenmek** idi. Haber bunun yalnızca bir kullanım alanıdır.

Yeni ürün tanımı:

> **Ispatla; yalnızca X üzerindeki sinyalleri kullanarak haber, meme, teknoloji, siyaset, spor, magazin, shitpost ve tamamen kullanıcı tarafından tanımlanabilen custom kategorilerde bir veya daha fazla X hesabını mümkün olduğunca otonom biçimde büyüten category-aware hit/growth engine'dir.**

Ana soru:

> **X'te şu anda hangi içerik fırsatı doğuyor; bu fırsat hangi kategori/kategorilere ait; hangi hesabımızda, hangi format ve üslupla, hangi anda yayınlanırsa beklenen ek erişim ve takipçi kazanımı en yüksek olur?**

Başarı metriği X creator payout'u değildir. Ana hedefler:

- yalnız hit olmuş şeyi değil **hit olmak üzere olan şeyi** yakalamak,
- rakiplerden önce güçlü fırsatları görmek,
- hesap ve kategori başına beklenen erişimi artırmak,
- takipçi kazanımını artırmak,
- yanlış/kalitesiz otomatik yayını azaltmak,
- her hesabın kendi kitlesinden ve geçmişinden öğrenmek,
- farklı içerik türlerine aynı haber kurallarını zorla uygulamamak,
- yanlış kararların neden yanlış olduğunu sonradan açıklayıp modeli düzeltmek,
- zamanla insanın manuel seçiminden daha iyi bir `what / where / when / how` motoru oluşturmak.

---

# 1. Kesin kapsam

## Veri kaynağı: yalnız X

Ispatla'nın radar ve öğrenme veri kaynağı **sadece X** olacaktır.

Kapsam dışı:

- Reddit
- Telegram
- RSS
- haber sitesi scraping'i
- GDELT
- YouTube
- Bluesky
- harici social-listening kaynakları

Bu karar bilinçlidir. Sistem başka platformları yarım yamalak anlamak yerine X ekosistemini çok derin modellemeye odaklanacaktır.

X içinde kullanılabilecek sinyaller:

- source hesapların original postları,
- quote ilişkileri,
- reply ilişkileri,
- mention ilişkileri,
- repost/quote yayılımı,
- public engagement metrikleri,
- public views mevcutsa view metrikleri,
- public profil/follower metrikleri,
- competitor postları,
- source ve competitor ağındaki bağlantılar,
- postların zaman içindeki performans snapshot'ları,
- aynı metin/meme/template'in farklı hesaplarda tekrar görünmesi,
- farklı topluluklara geçiş,
- belirli kategorilerde öne çıkan key-node hesapların katılımı,
- bizim kendi hesaplarımızın yayın sonrası gerçek performansı.

---

# 2. Haber yalnızca bir kategori olacak

Ispatla'nın en büyük kavramsal riski her şeyi haber gibi değerlendirmektir.

Bir deprem haberi ile bir meme aynı sinyallerle değerlendirilmemelidir:

- haber için doğrulama, kaynak kökeni, hız ve rakiplerden önce yayınlama önemlidir,
- meme için remix hızı, template novelty, community spread ve saturation önemlidir,
- shitpost/personality hesaplarında account-style fit, reply/quote üretme ve follower conversion daha önemli olabilir,
- teknoloji için source-topic authority ve teknik yenilik önemlidir,
- spor/transfer için insider alpha değeri önemlidir,
- politika için quote/reply potansiyeli yüksek olsa da factual/legal risk daha sıkıdır.

Bu nedenle **category bir string tag değil, pipeline davranışını değiştiren first-class nesne** olacaktır.

---

# 3. Category Engine

## 3.1 Built-in + gerçek custom category

Built-in template'ler olabilir:

```text
news
politics
technology
finance
sports
entertainment
meme
shitpost
culture
```

Ancak kategori listesi kapalı olmayacaktır.

Kullanıcı istediği kadar gerçek custom category yaratabilmelidir:

```text
linux
ai-drama
crypto-privacy
futbol-transfer
istanbul-local
absurd-turkey
startup-twitter
anime-meme
monero
open-source-ai
custom-niche-x
```

**`custom` diye tek bir kategori olmayacak.** `linux`, `monero`, `ai-drama` vb. DB'de kendi category kayıtlarıdır ve ayrı:

- source reputation,
- competitor set,
- baseline,
- hit history,
- account performance,
- AI context,
- scoring policy,
- publishing policy,
- feedback history

tutarlar.

## 3.2 Custom category inheritance

Custom category sıfırdan her davranışı tanımlamak zorunda olmamalıdır. Bir base strategy'den türeyebilmelidir.

Örnek:

```text
monero
baseStrategy: technology
verificationMode: moderate
clusterStrategy: topic
custom context: privacy coin / Monero ecosystem
```

```text
absurd-turkey
baseStrategy: meme
clusterStrategy: hybrid
verificationMode: minimal
```

```text
futbol-transfer
baseStrategy: sports
clusterStrategy: event
verificationMode: moderate
```

Bu şekilde custom category güçlü olur ama arbitrary executable code gerektirmez.

## 3.3 CategoryDefinition

```ts
type CategoryDefinition = {
  id: number;
  slug: string;
  name: string;
  enabled: boolean;
  builtIn: boolean;

  baseStrategy: "news" | "politics" | "technology" | "finance" | "sports" | "entertainment" | "meme" | "shitpost" | "generic";
  clusterStrategy: "event" | "topic" | "meme" | "conversation" | "format" | "hybrid";
  verificationMode: "strict" | "moderate" | "minimal" | "none";

  description: string;
  positiveExamples: string[];
  negativeExamples: string[];
  keywords: string[];
  excludedKeywords: string[];
  seedHandles: string[];

  defaultFormats: string[];
  sourcePolicy: Record<string, unknown>;
  riskPolicy: Record<string, unknown>;
  scoringPolicy: Record<string, unknown>;
  publishingPolicy: Record<string, unknown>;
  aiContext: string;
};
```

### Neden positive/negative examples?

Custom category yalnız keyword listesine dönüşmemelidir.

Örneğin `ai-drama`:

```text
positive:
- model benchmark kavgası
- AI şirketlerinin birbirine laf atması
- benchmark manipulation iddiası

negative:
- sıradan model release duyurusu
- generic AI tutorial
```

AI classifier + learned classifier bunu category anlamını daha iyi kavramak için kullanabilir.

## 3.4 Custom category validation

Custom kategori kaydedilirken sistem kontrol etmelidir:

- slug unique mi,
- description boş mu,
- en az bir tanımlayıcı sinyal var mı,
- başka kategoriyle neredeyse birebir duplicate mi,
- incompatible policy var mı,
- strict factual category iken verificationMode `none` seçilmiş mi,
- publish threshold mantıklı aralıkta mı,
- account'ta hiçbir usable source/category evidence yok mu.

Riskli config kaydedilebilir ama warning üretmelidir; kritik policy çelişkisi autopublish'i kapatabilir.

## 3.5 Custom category cold start

Yeni category'nin historical datası olmayacaktır.

Cold start sırası:

```text
base strategy prior
+ global hit model
+ custom description/examples
+ source hints
+ account history
```

Yeterli gerçek sonuç biriktikçe custom category kendi calibration ve statistics'ine geçer.

Asla 20 sample ile ayrı bir ML model eğitilip sahte kesinlik üretilmemelidir.

---

# 4. Account ↔ Category ilişkisi

Bir hesap tek kategoriye mahkûm olmayacaktır.

```ts
type AccountCategoryConfig = {
  accountId: number;
  categoryId: number;
  enabled: boolean;
  primary: boolean;
  weight: number;
  priority: number;

  publishThreshold?: number;
  dailyBudget?: number;
  styleOverride?: Record<string, unknown>;
  aiRouteOverride?: AccountAiRoute;
};
```

Örnek:

```text
@hesap_a
politics       weight 1.00 primary
news           weight 0.80
meme           weight 0.20
```

```text
@hesap_b
meme           weight 1.00 primary
shitpost       weight 0.80
news           disabled
```

Bir observation multi-label olabilir:

```text
technology: 0.92
meme:       0.71
business:   0.51
```

Her account kendi category config'ine göre ayrı opportunity score alır.

---

# 5. Category Strategy

Aynı feature her kategoride aynı anlama gelmemelidir.

Kavramsal abstraction:

```ts
interface CategoryStrategy {
  classify(input: Observation): CategoryMatch;
  cluster(input: Observation): ClusterDecision;
  extractFeatures(input: OpportunityContext): CategoryFeatures;
  qualityGate(input: OpportunityContext): GateResult;
  score(input: OpportunityContext): CategoryScore;
  buildWritingContext(input: OpportunityContext): WritingContext;
  feedbackTargets(): string[];
}
```

## News

Önemli:

- primary source,
- independent source count,
- source lineage,
- contradiction,
- event age,
- competitor lead time,
- claim delta,
- source-topic reliability,
- breakout acceleration.

## Meme

Önemli:

- template/media reuse velocity,
- unique remixer count,
- quote/repost growth,
- remix acceleration,
- source/community entropy,
- meme age,
- key-node participation,
- visual/text novelty,
- saturation,
- competitor reuse gap.

Aynı kökten gelen varyasyonlar haber tarafındaki gibi duplicate kanıt değil, **virality/remix graph** olabilir.

## Shitpost / personality

Önemli:

- account-style fit,
- expected reply rate,
- expected quote rate,
- follower conversion,
- conversation timing,
- repetition fatigue,
- current account load,
- historical wording/style performance.

## Technology

Önemli:

- source authority,
- novelty,
- technical specificity,
- topic fit,
- early expert participation,
- competitor gap,
- similar-topic performance.

## Politics

Önemli:

- event acceleration,
- quote/reply rate,
- source diversity,
- primary statement,
- account editorial fit,
- contradiction,
- legal/defamation risk,
- competitor gap.

## Sports / transfer

Önemli:

- insider/source alpha,
- first-to-confirm rate,
- downstream pickup,
- team/player relevance,
- fan-community spread,
- competitor gap.

---

# 6. Hesap ve kategori bazlı AI routing

Global provider/model ayarı fallback olarak kalmalıdır.

Her account kendi route'una sahip olabilir:

```ts
type AccountAiRoute = {
  analysisProvider?: string;
  analysisModel?: string;
  writingProvider?: string;
  writingModel?: string;
  reviewProvider?: string;
  reviewModel?: string;
  fallbackProvider?: string;
  fallbackModel?: string;
};
```

Ayrıca `account × category` override desteklenmelidir.

Örnek:

```text
@hesap_a / politics
analysis: Grok
writing: Grok
review: Luna/Terra
```

```text
@hesap_a / technology
analysis: Luna
writing: Luna
review: Terra
```

Kurallar:

1. account×category route varsa onu kullan,
2. yoksa account route,
3. yoksa global fallback,
4. provider başarısızsa explicit fallback,
5. fallback yoksa fail-closed,
6. model provenance her kararda DB'ye yazılır,
7. daha agresif/az kısıtlı model deterministic gate'leri bypass edemez.

AI'nın rolü:

- category classification,
- cluster kind,
- entity/topic/claim extraction,
- meme/template description,
- novelty,
- contradiction extraction,
- account fit açıklaması,
- writing/draft,
- ikinci görüş.

AI tek başına final hit oracle değildir.

---

# 7. Merkezi veri tipi: OpportunityCluster

`Event` haber için doğru ama tüm X içerikleri için dar kalır.

Ana abstraction:

```text
OpportunityCluster
```

```text
OpportunityCluster
 ├─ Observations
 ├─ Categories
 ├─ Entities / Topics
 ├─ Source lineage
 ├─ Metric snapshots
 ├─ Virality state
 ├─ Account opportunities
 ├─ Publishing history
 └─ Kind-specific data
      ├─ Event claims
      ├─ Meme/remix graph
      ├─ Conversation graph
      └─ Format trend metadata
```

```ts
type OpportunityCluster = {
  id: number;
  kind: "event" | "topic" | "meme" | "conversation" | "format" | "hybrid";
  summary: string;
  firstSeenAt: number;
  lastSeenAt: number;

  categoryScores: Record<string, number>;

  novelty: number;
  risk: number;
  emergenceScore: number;
  viralityScore: number;
  broadcastScore: number;
  cascadeScore: number;
  breakoutProbability: number;
  saturation: number;
};
```

Observation:

```ts
type ClusterObservation = {
  clusterId: number;
  postExternalId: string;
  sourceHandle: string;
  observedAt: number;
  observationType: "original" | "quote" | "reply" | "mention" | "competitor" | "remix";
  parentExternalId?: string;
};
```

News cluster `Claims` taşıyabilir.

Meme cluster:

- template fingerprint,
- caption family,
- remix count,
- remixer count,
- remix depth

gibi alanlar taşıyabilir.

---

# 8. Category-aware clustering

## Event/news

```text
lexical retrieval
→ entity extraction
→ normalized claim
→ semantic same-event comparison
```

## Meme

```text
media/perceptual fingerprint
+ caption similarity
+ quote/repost ancestry
+ semantic template description
```

## Topic

```text
entity/topic overlap
+ semantic similarity
+ time proximity
```

## Conversation

Reply/quote graph ve ortak target daha ağır sinyal.

## Format trend

Aynı joke structure/phrase/challenge farklı konularda tekrar ediyorsa format cluster olabilir.

`clusterKey()` deterministic fallback olarak kalabilir.

Merge/split audit edilebilir olmalıdır.

---

# 9. Time-series, acceleration ve Overperforming

Tek snapshot yeterli değildir.

Minimum milestone:

```text
first_seen
+2m
+5m
+10m
+20m
+60m
+6h
+24h
```

Post seviyesinde:

- views,
- likes,
- replies,
- reposts,
- quotes,
- follower snapshot.

Cluster seviyesinde:

- observation count,
- source count,
- independent source count,
- remix count,
- total engagement,
- competitor coverage,
- source/community entropy.

```text
velocity = delta(engagement) / delta(time)
```

```text
acceleration = recent_velocity - previous_velocity
```

Age-normalized baseline:

```text
source × category × topic × age_bucket
```

```text
overperformance = actual_at_age / median_expected_at_age
```

Küçük bir source'un 10 dakikada normalinin 10x üstüne çıkması büyük hesabın sıradan 10k engagement'ından daha erken hit sinyali olabilir.

---

# 10. Source lineage ve source-category reputation

Tek global source score yeterli değildir.

```text
@foo
politics: 0.91
meme:     0.73
sports:   0.08
```

Ayrıca source rolleri:

```text
news verifier
meme seed
trend amplifier
conversation starter
```

öğrenilebilir.

Tutulacak stats:

- first-to-hit rate,
- downstream pickup rate,
- source/category overperformance,
- correction/contradiction rate,
- remix seed rate,
- key-node predictive power,
- account-specific source performance.

Haber lineage:

```text
AA → BPT / Pusholder / DarkWeb
```

= tek origin olabilir.

Meme lineage:

```text
seed → remix A/B/C
```

= cascade sinyalidir.

Lineage aynı şekilde ölçülür ama category strategy farklı yorumlar.

---

# 11. Score katmanları

Tek `hitScore=91` kullanılmayacaktır.

## Emergence Score

> Yeni bir fırsat gerçekten doğuyor mu?

- cluster age,
- observation acceleration,
- source acceleration,
- mention/quote/reply burst,
- baseline anomaly,
- novelty,
- community/source diversity,
- early key nodes.

## Virality Score

> Yayılmaya devam edecek mi?

- velocity,
- acceleration,
- overperformance,
- broadcast score,
- cascade score,
- remix growth,
- source entropy,
- saturation.

## Account Opportunity Score

> Belirli hesabımızda çalışır mı?

- category fit,
- topic history,
- account residual history,
- format history,
- hour/day fit,
- competitor gap,
- source-account history,
- recent load,
- follower conversion history.

## Publish Confidence

News/politics'te verification güçlü component.

Meme/shitpost'ta:

- account fit,
- rights/policy risk,
- repetition,
- toxicity,
- factual claim presence

öne çıkar.

## Expected Incremental Reach

Uzun vadeli ana objective:

```text
EIR =
    breakoutProbability
  * accountOpportunity
  * publishConfidence
  * competitorOpportunity
  * timingValue
```

EIR X internal ranking score'u değildir.

---

# 12. Broadcast / Cascade / Saturation ayrı

Broadcast:

- tek büyük/key source,
- büyük initial reach.

Cascade:

- küçük/orta hesaplara yayılan zincir,
- community spread,
- remix/quote/repost growth.

Saturation:

- fırsat artık herkes tarafından kullanılmış mı,
- aynı format çok tekrarlandı mı,
- audience fatigue oluştu mu.

Bir cluster yüksek virality ama yüksek saturation nedeniyle artık düşük EIR üretebilir.

---

# 13. Category-specific competitor gap

Global competitor listesi yerine category competitor groups:

```text
news → BPT, Pusholder, DarkWeb...
meme → ilgili meme/shitpost hesapları
technology → teknoloji/AI hesapları
custom/monero → Monero/XMR hesapları
```

```text
competitorGap = 1 - weightedCategoryCompetitorCoverage
```

Weight:

- category dominance,
- historical reach,
- account similarity,
- topic dominance,
- follower count.

Timing:

```text
our_publish_at
first_relevant_competitor_publish_at
lead_time_seconds
```

Ayrıca tahmin target'ı:

```text
P(relevant competitor publishes within 15m)
```

olabilir.

---

# 14. Category lifecycle

## News

```text
RADAR → CANDIDATE → FIRST PUBLISH → DEVELOPING → MAJOR UPDATE → RESOLVED
```

## Meme

```text
SEED → EARLY REMIX → BREAKOUT → SATURATED → DECAY
```

## Topic / Conversation

```text
EMERGING → ACTIVE → TRENDING → FATIGUED → DECAY
```

## Format trend

```text
DISCOVERED → REPLICATING → BREAKOUT → OVERUSED → DEAD
```

Lifecycle publish kararına girmelidir.

---

# 15. Dynamic account × category publishing budget

Sabit 45 dakika cooldown yetersizdir.

Budget:

```text
account × category
```

seviyesinde olmalıdır.

Faktörler:

- cluster EIR,
- category density,
- recent account performance,
- competitor pressure,
- saturation,
- repetition,
- follower state,
- account load.

Aynı cluster spam'i lifecycle ve claim/remix delta ile önlenir.

---

# 16. Feedback: category-aware performance residual

Ham views label değildir.

```text
performanceResidual = actual / expected
```

Expected baseline:

```text
account
× category
× topic
× format
× time
× follower state
× recent load
```

Category-specific reward:

### News

- views residual,
- follower gain,
- competitor lead,
- correction rate.

### Meme

- views residual,
- repost/quote,
- remix pickup,
- follower gain.

### Shitpost

- reply/quote,
- follower gain,
- view residual.

### Technology/custom topic

- view residual,
- follower gain,
- topic retention,
- source/topic performance.

Tek reward function bütün kategorilere zorlanmamalıdır.

---

# 17. Shadow mode ve learned hit model

Yeni scoring doğrudan autopublish'e bağlanmayacaktır.

Shadow snapshot:

```text
14:01 cluster created
14:01 category predictions
14:01 account opportunities
14:05 breakout = 0.88
14:07 competitor gap = 1.0
14:12 competitor posted
15:01 actual outcome
```

Saklanacak:

- hangi cluster seçilirdi,
- hangi kategori görüldü,
- hangi account seçildi,
- hangi AI route kullanıldı,
- hangi format önerildi,
- hangi anda yayınlanırdı,
- gerçek sonuç.

Yeterli veri sonrası:

- CatBoost,
- LightGBM,
- XGBoost

gibi tabular modeller kullanılabilir.

Cold start:

```text
global model + category/base-strategy prior
```

Yeterli data sonrası category-specific calibration/model.

Train/test time-based olmalıdır; cluster leakage yasak.

---

# 18. Cross-Analysis / Decision Review Engine

Bu bölüm zorunludur. Ispatla yalnız karar vermemeli; **kendi kararlarının neden iyi/kötü sonuç verdiğini çapraz analiz etmelidir.**

Her candidate ve publication için bir `DecisionRecord` oluşturulmalıdır.

```ts
type DecisionRecord = {
  clusterId: number;
  accountId?: number;
  categoryId?: number;
  decidedAt: number;

  action: "ignore" | "radar" | "publish" | "delay" | "block";
  predictedEir: number;
  breakoutProbability: number;
  accountOpportunity: number;
  publishConfidence: number;

  selectedAiRoute: string;
  featureSnapshotId: number;
  reasonCodes: string[];
};
```

Sonuç geldiğinde karar bir veya birden fazla failure/success class'a bağlanır.

---

# 19. Hata sınıfları

## 19.1 False Positive

Sistem hit dedi ama olmadı.

Ölç:

- prediction yüksek miydi,
- source baseline yanlış mıydı,
- acceleration tek bot/network kaynaklı mıydı,
- competitor gap yanıltıcı mıydı,
- saturation geç mi hesaplandı,
- account fit kötü müydü.

## 19.2 False Negative / Missed Hit

Sistem düşük skorladı/ignore etti fakat cluster büyük hit oldu.

Bu en değerli hata sınıflarından biridir.

Sor:

- source listemizde miydi,
- first_seen çok geç mi,
- category yanlış mı,
- source küçük diye cezalandırıldı mı,
- novelty classifier kaçırdı mı,
- custom category mapping eksik miydi,
- competitor pickup modeli bunu önceden görebilir miydi.

## 19.3 Late Hit

Doğru fırsatı buldu ama çok geç.

```text
first_seen
ideal_publish
actual_publish
competitor_first_publish
```

ayrılır.

Root cause:

- scheduler yavaş,
- AI latency,
- review latency,
- verification fazla muhafazakâr,
- category assignment gecikmesi,
- metric snapshot gecikmesi.

## 19.4 Wrong Account

Cluster hit oldu fakat yanlış hesabımıza yönlendirildi.

Karşılaştır:

```text
predicted account A performance
counterfactual account B expected performance
```

Shadow/offline model diğer hesapları da skorlamalıdır.

## 19.5 Wrong Category

Örneğin AI-drama içeriği yalnız `technology` diye sınıflandı ve meme opportunity kaçtı.

Multi-label classifier calibration incelenmelidir.

## 19.6 Wrong Format / Wrong Angle

Cluster seçimi doğru fakat:

- text-only yerine media daha iyi olurdu,
- meme remix yerine düz açıklama basıldı,
- opening style kötüydü,
- çok uzun/kısa yazıldı,
- news account fazla personality kullandı.

## 19.7 Overposting

Tek tek postlar makul ama toplu account performance düşüyor.

Sinyaller:

- recent post cannibalization,
- follower-adjusted reach decay,
- engagement fatigue,
- category concentration.

## 19.8 Underposting

Publishing budget fazla muhafazakâr olduğu için yüksek EIR fırsatlar kaçtı.

## 19.9 Cross-account Cannibalization

Aynı veya çok benzer cluster birden fazla kendi hesabımızda gereksiz biçimde yayınlanıp hesaplar birbirini yiyebilir.

Ölç:

- content similarity,
- audience overlap proxy,
- publish time overlap,
- performance residual degradation.

Gerekirse portfolio selector bir cluster'ı yalnız en yüksek EIR hesabına verir.

## 19.10 Competitor Copy Trap

Rakip post attı diye fırsat güvenilir/hit sanılmamalıdır.

Competitor participation sinyal olabilir ama source truth değildir.

## 19.11 Viral-but-bad-growth

Yüksek view her zaman iyi değildir.

Bir post:

- çok quote-rage,
- düşük follow conversion,
- yüksek mute/block/report proxy,
- takipçi kaybı

üretebilir.

Bu durumda `views` yüksek olsa bile reward negatif olabilir.

## 19.12 Model Disagreement

Grok yüksek opportunity, Luna düşük risk/score vb. farklı görüş verebilir.

Disagreement DB'ye kaydedilmelidir:

```text
analysis_model_A score
analysis_model_B score
category disagreement
risk disagreement
```

Yüksek disagreement kritik kategorilerde review trigger olabilir.

---

# 20. Cross-feature ve cross-segment analizleri

Sistem düzenli olarak şu çaprazları analiz etmelidir:

```text
account × category
account × source
account × format
account × hour
account × AI model
account × category × AI model
category × clusterKind
category × source
category × competitor
source × age_bucket
source × category × age_bucket
format × category
openingStyle × category
media × category
publishLoad × performanceResidual
competitorGap × leadTime
breakoutProbability × actualHit
```

Amaç korelasyonu otomatik kural diye kabul etmek değil; **hangi segmentlerde modelin sistematik hata yaptığını bulmak**.

Örnek:

> Grok meme kategorisinde iyi candidate seçiyor fakat politics'te false-positive oranı yüksek.

> Luna technology'de iyi ama absurd-turkey custom kategorisinde çok muhafazakâr ve missed-hit üretiyor.

> `meme + text-only + 18:00-22:00` segmenti media meme'e göre düşük residual üretiyor.

Bunlar model routing ve policy calibration'a dönebilir.

---

# 21. Counterfactual analysis

Sistem yalnız "ne yaptık?" değil, mümkün olduğunca "başka karar verseydik ne olurdu?" sorusunu da yaklaşmalı cevaplamalıdır.

Tam causal certainty mümkün değildir; bu yüzden sonuçlar `estimated_counterfactual` diye etiketlenmelidir.

Örnek:

```text
published @news
predicted residual: 0.8x

shadow @meme
predicted residual: 2.1x
```

Bu, wrong-account analizini besler.

Ayrıca ignored candidate'ların final outcome'u izlenerek:

```text
missed opportunity cost
```

tahmini üretilebilir.

---

# 22. Critical Conditions / Kill Switches

Bazı durumlarda autopublish devam etmemelidir.

## Account-level pause

Şunlardan biri oluşursa account shadow-only veya paused moda geçebilir:

- ardışık publish failure,
- reconciliation failure spike,
- anormal follower kaybı,
- beklenmedik platform/publisher error,
- correction/false-publish spike,
- policy/risk rejection spike,
- model route tamamen unavailable.

## Category-level pause

Örneğin custom category yanlış config nedeniyle sürekli false-positive üretiyorsa yalnız o category otomasyonu durur.

Trigger örneği:

```text
falsePositiveRate(last N) > threshold
AND sampleCount >= minimum
```

## Model-route quarantine

Belirli account×category×model kombinasyonu:

- parse failure,
- hallucination,
- risk disagreement,
- false-positive spike

üretirse o route quarantine edilir ve fallback kullanılır.

## Data-quality degraded mode

Views/engagement snapshot verisi eksik veya tutarsızsa sistem sahte kesinlik üretmemelidir.

Mode:

```text
normal → degraded → shadow-only
```

## Viral manipulation suspicion

Koordine/bot-benzeri engagement ihtimali varsa:

- ani aynı-pattern hesap katılımı,
- düşük-diversity yüksek-volume,
- çok yeni hesap yoğunluğu erişilebiliyorsa,
- tekrar eden aynı metin,
- anormal quote/repost graph

`manipulationRisk` yükselir.

Bu sinyal hit'i tamamen çöpe atmak zorunda değildir fakat model bu spike'ı organik virality diye öğrenmemelidir.

---

# 23. Learning guardrails

Otomatik feedback loop yanlış şeyi öğrenebilir. Buna karşı açık guardrail gerekir.

## Survivorship bias

Yalnız yayınlanan postlardan öğrenmek yasak.

Ignored/shadow candidate outcome'ları da izlenmelidir.

## Self-fulfilling feedback

Büyük hesabımızda yayınladığımız için cluster büyümüş olabilir. Source virality ile bizim distribution etkimiz ayrılmaya çalışılmalıdır.

## Label leakage

Prediction anında henüz bilinmeyen future feature training input'a girmemelidir.

## Event/cluster leakage

Aynı cluster train ve test'e bölünmemelidir.

## Small-sample overfit

Custom category'nin az sample'ı varsa ağırlıklar dramatik biçimde değişmemelidir.

Hierarchical/global prior kullanılmalıdır.

## Model drift

X davranışı, hesap kitlesi veya source ekosistemi değişebilir.

Rolling evaluation gerekir:

```text
7d
30d
90d
```

performansı ayrı izlenmelidir.

---

# 24. Decision reason codes

Her karar açıklanabilir olmalıdır.

Örnek reason codes:

```text
HIGH_ACCELERATION
SOURCE_OVERPERFORMING
EARLY_KEY_NODE
HIGH_COMPETITOR_GAP
CATEGORY_STRONG_FIT
ACCOUNT_HISTORICAL_WIN
HIGH_SATURATION
LOW_PUBLISH_CONFIDENCE
SOURCE_DEPENDENCY
MODEL_DISAGREEMENT
ACCOUNT_OVERLOADED
CUSTOM_CATEGORY_COLD_START
MANIPULATION_RISK
```

Dashboard/analytics'te tek AI paragrafı yerine bunlar kullanılmalıdır.

---

# 25. Failure ledger

DB'de ayrı failure/decision ledger tutulmalıdır:

```text
decision_records
decision_outcomes
decision_failures
critical_incidents
model_route_health
category_health
```

`decision_failures` örnek alanlar:

```ts
type DecisionFailure = {
  decisionId: number;
  failureType: string;
  severity: "low" | "medium" | "high" | "critical";
  detectedAt: number;
  evidenceJson: string;
  rootCause?: string;
  resolvedAt?: number;
};
```

Kritik incident manuel veya otomatik resolved olana kadar kaybolmamalıdır.

---

# 26. KPI'lar

## Selection

- Precision@1 / @3 / @5,
- top-5% hit recall,
- top-1% hit recall,
- missed-hit rate,
- category-specific precision.

## Timing

- competitor lead time,
- first_seen → publish latency,
- late-hit rate.

## Growth

- performance residual,
- follower gain,
- follower gain per 1M views,
- account×category growth,
- viral-but-bad-growth rate.

## Failure quality

- false-positive rate,
- false-negative rate,
- wrong-account rate,
- wrong-category rate,
- wrong-format rate,
- overposting/underposting rate,
- cross-account cannibalization rate.

## Model quality

- calibration,
- model disagreement rate,
- account×category×model performance,
- fallback usage,
- quarantine count.

## Safety / operations

- correction rate,
- publish/reconciliation success,
- critical incident count,
- time in degraded/shadow-only mode.

---

# 27. Publishing transport

Pipeline transport-independent olmalıdır.

```ts
interface XPublisher {
  publish(input: PublishInput): Promise<PublishReceipt>;
}
```

```text
OfficialXApiPublisher  ← production hedefi
XUsePublisher          ← local/dev fallback gerekiyorsa
```

Reconciliation korunmalıdır.

Write receipt tek başına confirmed sayılmamalıdır.

---

# 28. Scheduler / source tiers

Bütün source'lar aynı hızda taranmayacaktır.

### Tier A

Category/topic bazında yüksek alpha/predictive source.

### Tier B

Major competitor/amplifier.

### Tier C

Discovery long-tail.

Source tier global değil category-specific olabilir:

```text
@foo meme Tier A
@foo politics Tier C
```

---

# 29. DB / veri katmanı

Önerilen tablolar:

```text
categories
account_categories
category_competitors
account_ai_routes

opportunity_clusters
cluster_categories
cluster_observations
cluster_entities
cluster_claims
cluster_metric_snapshots
post_metric_snapshots

source_category_stats
source_topic_stats
source_lineage

account_category_stats
account_topic_stats
account_source_stats
account_format_stats

competitor_cluster_coverage
hit_predictions
shadow_decisions
model_outcomes

decision_records
decision_outcomes
decision_failures
critical_incidents
model_route_health
category_health
```

Meme/media tarafı sonra:

```text
cluster_media_fingerprints
cluster_remix_edges
```

Migration tek PR'de yapılmamalıdır.

Mevcut `styleProfile.categories` gerçek category kayıtlarına migrate edilmelidir.

---

# Uygulama sırası

## Phase 0 — Category + custom category + AI routing

- [ ] `CategoryDefinition`
- [ ] built-in category templates
- [ ] gerçek custom category CRUD
- [ ] baseStrategy inheritance
- [ ] positive/negative examples
- [ ] seed handles / keyword hints
- [ ] custom category validation
- [ ] `account_categories`
- [ ] primary/secondary categories
- [ ] weight/threshold/budget
- [ ] account AI route
- [ ] account×category AI override
- [ ] provenance
- [ ] existing category migration

### Done when

Kullanıcı `monero` veya `ai-drama` diye yeni kategori açabilir; kategori kendi base strategy/policy/context'ine sahip olur ve iki farklı account aynı X postunu farklı category/AI route ile değerlendirebilir.

---

## Phase 1 — Time-series / Overperforming

- [ ] post metric snapshots
- [ ] 2m/5m/10m/20m/60m schedule
- [ ] source×category×age baselines
- [ ] acceleration
- [ ] overperformance

### Done when

Sistem source'un kendi normuna göre breakout anomaly ölçebilir.

---

## Phase 2 — OpportunityCluster

- [ ] event/topic/meme/conversation/format/hybrid
- [ ] observations
- [ ] category multi-label
- [ ] category-aware clustering
- [ ] merge/split audit

### Done when

News event, meme remix ve conversation aynı news-only data modeline zorlanmaz.

---

## Phase 3 — Category Strategies

- [ ] news
- [ ] meme
- [ ] technology/generic topic
- [ ] politics
- [ ] sports
- [ ] shitpost/personality
- [ ] custom strategy inheritance
- [ ] category lifecycle
- [ ] category quality gates

---

## Phase 4 — Source graph / reputation

- [ ] lineage
- [ ] independent source factual categories
- [ ] remix graph meme
- [ ] source entropy
- [ ] source-category stats
- [ ] source-topic stats
- [ ] key nodes

---

## Phase 5 — Competitor gap

- [ ] category competitor sets
- [ ] competitor→cluster mapping
- [ ] category dominance weights
- [ ] competitor gap
- [ ] lead time

---

## Phase 6 — Multi-score + EIR

- [ ] Emergence
- [ ] Virality
- [ ] Account Opportunity
- [ ] Publish Confidence
- [ ] Broadcast/Cascade
- [ ] Saturation
- [ ] Breakout Probability
- [ ] EIR

---

## Phase 7 — Shadow mode

- [ ] point-in-time snapshots
- [ ] predicted category/account/format/time
- [ ] ignored candidate tracking
- [ ] future outcome
- [ ] competitor outcome

---

## Phase 8 — Cross-analysis / Failure Observatory

- [ ] `decision_records`
- [ ] outcome reconciliation
- [ ] false positive detection
- [ ] missed-hit detection
- [ ] late-hit detection
- [ ] wrong-account analysis
- [ ] wrong-category analysis
- [ ] wrong-format analysis
- [ ] overposting/underposting analysis
- [ ] cross-account cannibalization
- [ ] viral-but-bad-growth detection
- [ ] model disagreement ledger
- [ ] reason codes

### Done when

Bir kötü sonuç için sistem yalnız "post düşük performans gösterdi" demez; örneğin:

> `MISSED_HIT: category classifier meme=0.31 ile düşük kaldı; source 10m baseline'ının 8.4x üstündeydi; competitor 11 dakika sonra yayınladı; account @meme için shadow EIR 0.87 idi.`

şeklinde root-cause kanıtı sunabilir.

---

## Phase 9 — Learned models

- [ ] global baseline
- [ ] category features
- [ ] account features
- [ ] time split
- [ ] leakage guards
- [ ] CatBoost/LightGBM
- [ ] calibration
- [ ] category-specific model yalnız yeterli data varsa

---

## Phase 10 — Critical incident / kill switches

- [ ] account health
- [ ] category health
- [ ] model route health
- [ ] degraded mode
- [ ] shadow-only automatic transition
- [ ] route quarantine
- [ ] false-publish spike trigger
- [ ] data-quality trigger
- [ ] manipulation-risk trigger

### Done when

Bir model veya custom category kötüleştiğinde bütün sistem kör şekilde paylaşmaya devam etmez; yalnız etkilenen account/category/model route izole edilebilir.

---

## Phase 11 — Dynamic publishing portfolio

- [ ] account×category attention budget
- [ ] hard cooldown replacement
- [ ] same-cluster anti-spam
- [ ] cross-account portfolio selector
- [ ] cannibalization penalty
- [ ] exploration budget

---

## Phase 12 — Production publisher

- [ ] XPublisher interface
- [ ] official X write path
- [ ] x-use isolation
- [ ] reconciliation
- [ ] rate-limit awareness

---

# Öncelik dışı

Şimdilik yapılmamalı:

- haber sitesi/CMS,
- Reddit/RSS/Telegram ingestion,
- gereksiz agent framework,
- UI redesign uğruna scoring/measurement geciktirmek,
- LLM büyütünce hit detection düzelir varsayımı,
- bütün kategorilere tek verification policy,
- custom category'yi string tag olarak bırakmak,
- yeterli sample olmadan her custom kategoriye ayrı model,
- Hawkes/neural virality gibi ileri modelleri data olmadan eklemek,
- yüksek views = başarılı büyüme varsayımı,
- yalnız yayınlanan postlardan öğrenmek,
- X internal ranking score'unu bildiğimizi iddia etmek.

---

# Son ürün tanımı

Ispatla'nın hedef hali:

> **Yalnızca X üzerindeki source, competitor, conversation ve engagement ağını izleyen; postları event, topic, meme/remix, conversation ve format opportunity cluster'larında birleştiren; built-in veya tamamen kullanıcı tarafından oluşturulan custom kategorileri first-class strategy olarak çalıştıran; her account×category için farklı AI provider/model, stil, source policy, competitor set ve publishing budget kullanabilen; acceleration, age-normalized overperformance, source-category reputation, competitor gap ve account geçmişinden hit olasılığı/EIR tahmin eden; doğru içeriği doğru hesapta doğru anda yayınlayan; yaptığı ve yapmadığı kararların sonuçlarını çapraz analiz edip false positive, missed hit, wrong account/category/format, overposting, cannibalization ve model drift gibi hataları otomatik tespit eden; kritik bozulmalarda ilgili account/category/model route'u shadow-only veya paused moda alabilen X-only otonom hit engine.**

Ana moat:

```text
X-only signal graph
+ first-class custom categories
+ category-aware opportunity clustering
+ account × category AI routing
+ account × category learning
+ time-series acceleration
+ age-normalized overperformance
+ source-category/topic reputation
+ category-specific competitor gap
+ performance residual
+ decision/failure cross-analysis
+ critical-condition isolation
+ verified publishing feedback
```

AI metin üretimi tek başına moat değildir.

Haber tek başına ürün değildir.

Asıl moat, **X'te hangi fırsatın doğduğunu doğru kategori mantığıyla erken anlamak; bunu hangi hesabın kitlesine hangi format ve zamanda vermenin en yüksek incremental reach/follower value üreteceğini öğrenmek; yanlış kararların kök nedenlerini sistematik biçimde bulup aynı hatayı tekrar etmemek** olacaktır.