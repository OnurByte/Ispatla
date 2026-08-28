# Ispatla — X-Only Otonom Hit Engine Planı

Bu belge Ispatla'nın bundan sonraki ürün yönünü tanımlar.

Ispatla'nın amacı bir haber sitesi veya yalnızca haber hesabı otomasyonu değildir. Orijinal XPatla fikrinin esas değeri **X üzerinde hit olabilecek içeriği erkenden bulmak, doğru hesaba doğru biçimde uyarlamak, doğru anda yayınlamak ve sonuçtan öğrenmek** idi. Haber bunun yalnızca bir kullanım alanıdır.

Yeni ürün tanımı:

> **Ispatla; yalnızca X üzerindeki sinyalleri kullanarak haber, meme, teknoloji, siyaset, spor, magazin, shitpost ve kullanıcı tanımlı diğer kategorilerde bir veya daha fazla X hesabını mümkün olduğunca otonom biçimde büyüten category-aware hit/growth engine'dir.**

Ana soru artık yalnızca:

> Hangi haber olayını yayınlayalım?

olmayacaktır. Asıl soru:

> **X'te şu anda hangi içerik fırsatı doğuyor; bu fırsat hangi kategoriye ait; hangi hesabımızda, hangi format ve üslupla, hangi anda yayınlanırsa beklenen ek erişim ve takipçi kazanımı en yüksek olur?**

Ispatla'nın başarı metriği X creator payout'u değildir. Ana hedefler:

- rakiplerden önce güçlü fırsatları yakalamak,
- yalnız hit olmuş şeyi değil **hit olmak üzere olan şeyi** yakalamak,
- hesap ve kategori başına beklenen erişimi artırmak,
- takipçi kazanımını artırmak,
- gereksiz/kalitesiz otomatik yayını düşük tutmak,
- her hesabın kendi kitlesinden ve geçmişinden öğrenmek,
- farklı içerik türlerine aynı haber kurallarını zorla uygulamamak,
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

Bu karar bilinçlidir. Sistem başka platformları yarım yamalak anlamak yerine X ekosistemini olabildiğince iyi modellemeye odaklanacaktır.

X içinde kullanılabilecek sinyaller:

- takip edilen source hesapların original postları,
- quote ilişkileri,
- reply ilişkileri,
- mention ilişkileri,
- repost/quote yayılımı,
- public engagement metrikleri,
- public views mevcutsa view metrikleri,
- yazarın public profil/follower metrikleri,
- competitor postları,
- source ve competitor ağındaki bağlantılar,
- postların zaman içindeki performans snapshot'ları,
- aynı metin/meme/template'in farklı hesaplarda tekrar görünmesi,
- farklı topluluklara geçiş,
- belirli kategorilerde öne çıkan key-node hesapların katılımı.

---

# 2. Haber bir kategori olacak, ürünün kendisi değil

Ispatla'nın mevcut tasarımındaki en büyük kavramsal risk her şeyi haber gibi değerlendirmektir.

Bir deprem haberi ile bir meme aynı sinyallerle değerlendirilmemelidir:

- Haber için doğrulama, kaynak kökeni ve rakiplerden önce yayınlama önemlidir.
- Meme için remix hızı, farklı topluluklara yayılım, template novelty ve görsel tekrar daha önemli olabilir.
- Shitpost için account-style fit, reply/quote üretme ve takipçi dönüşümü daha önemli olabilir.
- Teknoloji hesabı için source-topic authority ve teknik doğruluk önemlidir.
- Spor/transfer hesabı için belirli insider hesapların alpha değeri çok önemlidir.
- Politik hesap için quote/reply hızı yüksek olabilir fakat yanlış bilgi, bağlam ve hukuki risk gate'leri daha sıkı olmalıdır.

Bu yüzden **kategori Ispatla'da bir label değil, davranışı değiştiren first-class ürün nesnesi** olacaktır.

---

# 3. Category sistemi

## 3.1 Category enum olmayacak

Kategori sistemi yalnız sabit bir TypeScript enum'una kilitlenmemelidir.

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
custom
```

Ancak bunlar ürünün son listesi değildir. Kullanıcı istediği kategoriyi tanımlayabilmelidir.

Örnek custom kategoriler:

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
custom-niche-x
```

`custom` tek bir çöp kutusu kategorisi değildir. Her kullanıcı kategorisi kendi kimliğine, kurallarına ve öğrenme geçmişine sahip olmalıdır.

## 3.2 Önerilen CategoryDefinition

```ts
type CategoryDefinition = {
  id: number;
  slug: string;
  name: string;
  builtIn: boolean;
  enabled: boolean;

  clusterStrategy: "event" | "topic" | "meme" | "conversation" | "format" | "hybrid";
  verificationMode: "strict" | "moderate" | "minimal" | "none";
  defaultFormats: string[];

  sourcePolicy: Record<string, unknown>;
  riskPolicy: Record<string, unknown>;
  scoringPolicy: Record<string, unknown>;
  publishingPolicy: Record<string, unknown>;
  aiContext: string;
};
```

Custom category oluştururken kullanıcı arbitrary executable code yazmayacak. İlk aşamada davranış settings/policy üzerinden tanımlanacaktır.

Daha sonra category strategy registry ile built-in davranışlar kod tarafında genişletilebilir.

## 3.3 Account ↔ Category ilişkisi

Bir hesap tek kategoriye mahkûm olmamalıdır.

```ts
type AccountCategoryConfig = {
  accountId: number;
  categoryId: number;
  enabled: boolean;
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

politics      weight 1.0
news          weight 0.8
meme          weight 0.25
```

Başka hesap:

```text
@hesap_b

meme          weight 1.0
shitpost      weight 0.8
news          disabled
```

Aynı X sinyali iki hesap için tamamen farklı opportunity oluşturabilir.

## 3.4 Primary category + secondary categories

Her hesapta:

- primary category,
- secondary categories,
- custom categories,
- category weights

olabilir.

Primary category hesabın baseline davranışını belirler; secondary kategoriler fırsat bulunduğunda devreye girer.

Bu sayede örneğin teknoloji hesabı normalde teknoloji paylaşırken devasa bir AI meme trendini de kaçırmayabilir.

## 3.5 Category classifier multi-label olacak

Yeni observation tek kategoriye zorlanmamalıdır.

Örneğin:

```text
"OpenAI CEO'su rakip modeli meme ile tiye aldı"
```

şu şekilde etiketlenebilir:

```text
technology: 0.92
meme:       0.71
business:   0.51
```

Her account kendi category config'ine göre bu fırsatı değerlendirebilir.

---

# 4. Category Strategy: aynı feature her içerikte aynı anlama gelmez

Kategoriye göre davranış değişmelidir.

Önerilen abstraction:

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

İlk sürümde bütün bunlar ayrı sınıflar olmak zorunda değildir. Önemli olan veri modelinin ve pipeline'ın bu ayrımı desteklemesidir.

## 4.1 News strategy

Önemli feature'lar:

- independent source count,
- primary source,
- source lineage,
- contradiction,
- event age,
- competitor lead time,
- claim delta,
- source-topic reliability,
- breakout acceleration.

Quality gate sıkı.

## 4.2 Meme strategy

Meme için `Claim` zorunlu değildir.

Önemli feature'lar:

- template/media reuse velocity,
- unique remixer count,
- quote/repost growth,
- source/community entropy,
- meme age,
- remix acceleration,
- key-node participation,
- saturation,
- account meme history,
- visual/text novelty,
- competitor reuse gap.

Meme'de aynı kökten gelen çok sayıda varyasyon haber tarafındaki gibi "bağımsız doğrulama yok" diye cezalandırılmamalıdır. Tam tersine **remix chain virality sinyali** olabilir.

## 4.3 Shitpost / personality strategy

Önemli feature'lar:

- account-style fit,
- expected reply rate,
- expected quote rate,
- follower conversion history,
- linguistic similarity to winning account posts,
- conversation timing,
- repetition fatigue,
- audience saturation,
- current account load.

Burada doğrulama gate'i ancak factual claim varsa devreye girer.

## 4.4 Technology strategy

Önemli feature'lar:

- source authority in topic,
- novelty,
- product/release importance,
- technical specificity,
- account topic fit,
- early expert participation,
- mainstream competitor gap,
- historical performance of similar topics.

## 4.5 Politics strategy

Önemli feature'lar:

- event/news acceleration,
- quote/reply rate,
- source diversity,
- primary statement availability,
- account ideological/editorial fit,
- contradiction,
- legal/defamation risk,
- competitor gap.

Politika yüksek engagement üretebilir fakat rage-bait ile gerçek account growth ayrılmalıdır.

## 4.6 Sports / transfer strategy

Önemli feature'lar:

- source-topic alpha,
- insider history,
- first-to-confirm rate,
- downstream pickup rate,
- player/team relevance,
- fan-community spread,
- competitor gap,
- event age.

---

# 5. Hesap bazlı AI routing

Mevcut global AI provider/model ayarı kaldırılmamalı; **fallback/default** olarak kalmalıdır. Her yayın hesabı kendi AI routing ayarına sahip olmalıdır.

Örnek:

```text
@hesap_a
analysis provider: xAI
analysis model: Grok
writing provider: xAI
writing model: Grok
review provider: OpenAI
review model: Luna/Terra
```

Başka hesap:

```text
@hesap_b
analysis provider: OpenAI
analysis model: Luna
writing provider: OpenAI
writing model: Luna
review provider: OpenAI
review model: Terra
```

Farklı hesapların:

- politik/editoryal ekseni,
- mizah toleransı,
- içerik hassasiyeti,
- sansür/tutuculuk toleransı,
- dil/tarz ihtiyacı,
- maliyet bütçesi,
- latency ihtiyacı

farklı olabilir.

## Account AI config

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

Kurallar:

1. Hesap route'u varsa o kullanılır.
2. Yoksa global provider/model fallback olur.
3. Provider/model erişilemiyorsa account fallback denenir.
4. Fallback de yoksa otomatik yayın fail-closed kalır.
5. Model provenance DB'de tutulur.
6. Analysis, writing ve review aynı provider olmak zorunda değildir.
7. Category-level route override opsiyonel olarak desteklenebilir.
8. Aynı hesap meme için Grok, teknik doğrulama için Luna/Terra gibi farklı route kullanabilmelidir.

### Grok ve daha agresif modeller

Grok gibi daha az çekingen davranabilen modeller bazı hesap/kategorilerde analysis/writing engine olabilir.

Ancak model seçimi deterministic gate'leri bypass edemez.

Model:

- category classification,
- cluster kind,
- entity/event extraction,
- meme/template açıklaması,
- relevance,
- novelty,
- tone,
- draft üretimi

yapabilir.

Model tek başına:

- risk bypass,
- rights bypass,
- duplicate bypass,
- category budget bypass,
- factual verification bypass,
- account policy bypass

yapamaz.

---

# 6. Merkezi veri tipi: Post veya Event değil Opportunity Cluster

`Event` haber için doğru, fakat meme ve shitpost için fazla dar bir soyutlamadır.

Yeni üst tip:

```text
OpportunityCluster
```

olmalıdır.

Önerilen yapı:

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
      ├─ Meme template/remix graph
      ├─ Conversation graph
      └─ Format/trend metadata
```

## OpportunityCluster

```ts
type OpportunityCluster = {
  id: number;
  kind: "event" | "topic" | "meme" | "conversation" | "format" | "hybrid";
  summary: string;
  firstSeenAt: number;
  lastSeenAt: number;

  categoryScores: Record<string, number>;
  status: string;

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

## Observation

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

## NewsEvent subtype

Factual/news cluster'larda ayrıca:

```text
Claims
Verification state
Major update state
Primary source state
```

tutulur.

## MemeCluster subtype

Meme cluster'larda ayrıca:

```text
template fingerprint
media fingerprint
caption family
remix count
unique remixer count
remix depth
community spread
```

tutulabilir.

Her cluster türüne `Claim` zorunlu kılınmayacaktır.

---

# 7. Category-aware clustering

Tek semantic event clustering bütün kategoriler için yeterli değildir.

## Event/news clustering

```text
lexical candidate retrieval
→ entity extraction
→ normalized claim
→ semantic same-event comparison
```

## Meme clustering

```text
media/perceptual fingerprint
+ caption/text similarity
+ quote/repost ancestry
+ semantic template description
```

Aynı template farklı yazıyla paylaşılmışsa aynı meme cluster'a girebilmelidir.

## Topic clustering

```text
entity/topic overlap
+ semantic similarity
+ time proximity
```

## Conversation clustering

Reply/quote ağı ve ortak target post/account daha ağır sinyal olmalıdır.

## Format/trend clustering

Belirli bir post formatı, phrase, challenge veya joke structure farklı topic'lerde tekrar ediyorsa ayrı `format` cluster oluşabilir.

Mevcut `clusterKey()` deterministic fallback/fingerprint olarak kalabilir fakat ana abstraction olmamalıdır.

Cluster merge/split audit edilebilir olmalıdır.

---

# 8. Source lineage kategoriye göre farklı anlam taşımalı

Haber tarafında:

```text
AA
 ├─ BPT
 ├─ Pusholder
 └─ DarkWeb
```

üç bağımsız doğrulama değildir.

Burada:

```text
independentSourceCount = 1
```

olmalıdır.

Meme tarafında ise aynı kökten yayılan varyasyonlar:

```text
seed
 ├─ remix A
 ├─ remix B
 ├─ remix C
 └─ quote variation D
```

**negatif duplication değil virality graph** olabilir.

Bu nedenle lineage feature'larının anlamı category strategy tarafından yorumlanmalıdır.

Tutulacak genel metrikler:

- `originSourceCount`
- `sourceEntropy`
- `uniqueSourceCount`
- `independentSourceCount`
- `remixCount`
- `remixDepth`
- `aggregatorCount`
- `primarySourcePresent`
- `sourceDiversity`

---

# 9. Source reputation global değil category-specific olacak

Tek source score yetersizdir.

Bir hesap:

```text
transfer: 97
politics: 11
meme: 68
```

olabilir.

Dahası aynı hesap farklı rollerde değerli olabilir:

```text
news verifier
meme seed
conversation starter
trend amplifier
```

Önerilen yapı:

```text
source_category_stats
source_topic_stats
```

Feature'lar:

- first-to-hit rate,
- downstream pickup rate,
- historical overperformance,
- category hit participation rate,
- source correction/contradiction rate,
- remix seed rate,
- key-node predictive power,
- account-specific source performance.

Bu skor zamanla gerçek sonuçtan öğrenmelidir; yalnız LLM görüşü olmamalıdır.

---

# 10. Tek Hit Score yerine ayrılmış skorlar

Tek bir AI `score=91` oracle olmayacaktır.

Her cluster için en az şu katmanlar ayrı tutulmalıdır.

## 10.1 Emergence Score

> X'te yeni bir fırsat gerçekten doğuyor mu?

Genel feature'lar:

- cluster age,
- yeni observation hızı,
- yeni source hızı,
- quote/reply/repost burst,
- baseline anomaly,
- source/community diversity,
- novelty,
- key-node early participation.

Category strategy ek feature sağlayabilir.

## 10.2 Virality Score

> Bu cluster yayılmaya devam edecek mi?

Feature'lar:

- velocity,
- acceleration,
- overperformance,
- broadcast score,
- cascade score,
- source entropy,
- repost/quote/reply growth,
- remix velocity,
- community spread,
- saturation.

## 10.3 Account Opportunity Score

> Bu cluster belirli hesabımızda iyi çalışır mı?

Feature'lar:

- account category fit,
- account topic history,
- account historical residual,
- source-account history,
- hour/day fit,
- format history,
- competitor gap,
- recent account load,
- style fit,
- follower conversion history.

Aynı cluster:

```text
@haber:      88
@meme:       96
@teknoloji:  34
```

olabilir.

## 10.4 Publish Confidence / Quality Confidence

`Verification Confidence` yalnız haber için doğru isimdir.

Genel sistemde:

```text
PublishConfidence
```

olmalıdır.

News/politics gibi factual kategorilerde bunun önemli parçası verification'dır.

Meme/shitpost gibi kategorilerde ise:

- rights/safety,
- account fit,
- repetition,
- toxicity/risk,
- policy risk,
- factual-claim presence

öne çıkar.

## 10.5 Expected Incremental Reach

Ana objective uzun vadede:

```text
Expected Incremental Reach (EIR)
```

olmalıdır.

İlk sürüm:

```text
EIR =
    breakoutProbability
  * accountOpportunity
  * publishConfidence
  * competitorOpportunity
  * timingValue
```

Ama category strategy gerekirse bileşenleri farklı yorumlayabilir.

---

# 11. Acceleration ve time-series snapshot

Tek snapshot yeterli değildir.

Minimum milestone'lar:

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
- follower count

tutulmalıdır.

Cluster seviyesinde:

- observation count,
- unique source count,
- independent source count,
- remix count,
- total engagement,
- competitor count,
- community/source entropy

tutulmalıdır.

```text
velocity_window = delta(engagement) / delta(time)
```

```text
acceleration = recent_velocity - previous_velocity
```

```text
normalized_acceleration =
  (v_recent - v_previous) / max(abs(v_previous), epsilon)
```

Early-hit için yalnız yüksek hız değil **hızın artışı** önemlidir.

---

# 12. Age-normalized Overperforming

Her source'un kendi normal performansı öğrenilmelidir.

Örnek:

```text
@sourceA
2m median engagement: 4
5m median engagement: 12
10m median engagement: 31
20m median engagement: 67
60m median engagement: 155
```

Yeni post 10 dakikada 217 engagement aldıysa:

```text
overperformance_10m = 217 / 31 = 7.0x
```

Daha sonra baseline:

```text
source × category × topic × age_bucket
```

olmalıdır.

Bu özellikle meme gibi kategorilerde küçük hesaplardan çıkan anormal breakout'ları yakalamak için çok değerlidir.

---

# 13. Broadcast Score ve Cascade Score ayrı

Virality tek tip değildir.

## Broadcast

Tek büyük/key account'ın postu doğrudan büyük dağıtım oluşturabilir.

## Cascade

Küçük/orta hesaplar arasında içerik giderek yayılır.

Meme'lerde cascade/remix ağı daha önemli olabilir.

Breaking news'te güçlü primary-source broadcast tek başına yeterli olabilir.

Bu nedenle:

```text
broadcastScore
cascadeScore
```

ayrı tutulmalı ve category-aware `breakoutProbability` bunlardan yararlanmalıdır.

---

# 14. Competitor Gap kategori bazlı olacak

Competitor tracking yalnız analytics değildir; publish feature'dır.

Ancak tek global competitor listesi yeterli değildir.

Örnek:

```text
news competitors:
BPT, Pusholder, DarkWeb

meme competitors:
@memeA, @memeB, @shitpostC

technology competitors:
@techA, @aiB
```

Her category kendi competitor set/weight'lerine sahip olabilir.

```text
competitorGap = 1 - weightedCategoryCompetitorCoverage
```

Competitor weight:

- category dominance,
- historical reach,
- account similarity,
- topic dominance,
- follower count

ile öğrenilebilir.

Tutulacak timing:

```text
our_publish_at
first_relevant_competitor_publish_at
lead_time_seconds
```

Meme kategorisinde ayrıca:

```text
first_competitor_remix_at
```

tutulabilir.

---

# 15. Key-node prediction kategori bazlı olacak

Bazı hesaplar belirli kategorilerde hit oluşmadan önce sürekli görünür.

Öğrenilecek değer:

```text
P(cluster becomes hit | source participates early, category/topic)
```

Örnek:

```text
@foo
politics: 0.72
meme:     0.81
sports:   0.04
```

Takipçi sayısı tek başına key-node değildir.

---

# 16. Cluster lifecycle kategoriye göre değişecek

Tek haber lifecycle'ı tüm içeriklere uygulanmayacaktır.

## News/Event

```text
RADAR
→ CANDIDATE
→ FIRST PUBLISH
→ DEVELOPING
→ MAJOR UPDATE
→ RESOLVED
```

Major update `claim delta` ile çalışır.

## Meme

```text
SEED
→ EARLY REMIX
→ BREAKOUT
→ SATURATED
→ DECAY
```

## Topic/Conversation

```text
EMERGING
→ ACTIVE
→ TRENDING
→ FATIGUED
→ DECAY
```

## Format trend

```text
DISCOVERED
→ REPLICATING
→ BREAKOUT
→ OVERUSED
→ DEAD
```

Bu lifecycle publishing kararını doğrudan etkiler. Örneğin çok iyi meme ama `OVERUSED` ise artık geç kalınmıştır.

---

# 17. Factual verification yalnız gereken kategoride sıkı olacak

Mevcut haber mantığındaki verification özellikleri korunacaktır fakat tüm içeriklere zorla uygulanmayacaktır.

### Strict

News, politics, finance gibi kategoriler:

- primary source,
- independent source count,
- contradiction,
- source lineage,
- factual risk

kullanır.

### Moderate

Technology, sports gibi kategoriler:

- source-topic authority,
- origin post,
- corroboration

kullanabilir.

### Minimal / None

Meme, shitpost gibi içerikte factual claim yoksa bağımsız kaynak doğrulaması gerekmeyebilir.

Ancak meme/shitpost içinde gerçek kişi hakkında ciddi factual iddia varsa factual-risk detector daha sıkı moda geçebilir.

---

# 18. Dynamic publishing budget account × category olacak

Sabit 45 dakikalık cooldown ve global daily limit yetersizdir.

Budget şu seviyede tutulmalıdır:

```text
account × category
```

Örnek:

```text
@accountA
news: 12/day
meme: 4/day
politics: 8/day
```

Ama bunlar statik tavandan çok başlangıç politikasıdır.

Budget faktörleri:

- category density,
- current cluster quality,
- recent account performance,
- saturation,
- competitor pressure,
- follower state,
- duplicate/repetition risk,
- recent account load.

News yoğun günde frekans artabilir.

Meme hesabında 5 zayıf meme yerine 1 çok güçlü fırsat tercih edilebilir.

---

# 19. Feedback: raw views değil category-aware residual

Ham views tek başına label değildir.

```text
performanceResidual = actual / expected
```

Expected baseline:

```text
account
× category
× topic
× format
× hour/day
× follower state
× recent load
```

üzerinden öğrenilmelidir.

Kategoriye göre feedback target değişebilir.

## News

- views,
- follower gain,
- competitor lead time,
- correction rate.

## Meme

- views,
- repost rate,
- quote rate,
- remix pickup,
- follower gain,
- downstream spread.

## Shitpost

- reply rate,
- quote rate,
- follower gain,
- view residual.

## Technology

- view residual,
- bookmark/share proxy erişilebilirse,
- follower gain,
- source/topic performance.

Tek global reward function bütün hesaplara dayatılmamalıdır.

---

# 20. X engagement türlerini ayrı öğren

Erken heuristic için:

```text
likes + replies + reposts + quotes
```

kalabilir.

Feedback'te ayrı label:

- like rate,
- reply rate,
- repost rate,
- quote rate,
- views,
- follower delta,
- public/API üzerinden erişilebilen başka sinyaller.

Category strategy bunların önemini farklı öğrenebilir.

Örneğin meme için repost çok güçlü olabilir; personality account için reply/quote daha değerli olabilir.

X'in açık kaynak ranking ağırlıkları ham engagement sayılarına doğrudan çarpılmamalıdır.

---

# 21. AI'nın rolü: classifier + feature extractor + writer

AI `hitScore=91` veren oracle olmayacaktır.

AI görevleri:

- category classification,
- cluster kind,
- entities/topic,
- normalized factual claim gerekiyorsa,
- meme/template description,
- novelty,
- account fit açıklaması,
- contradiction extraction gereken kategoride,
- style transformation,
- draft generation,
- ikinci görüş.

Deterministic / learned katman:

- acceleration,
- overperformance,
- source/category reputation,
- competitor gap,
- publishing budget,
- saturation,
- historical account fit,
- expected performance,
- final ordering.

Category `aiContext` modele o kategorinin neyi optimize ettiğini anlatmalıdır.

---

# 22. Shadow mode zorunlu

Yeni hit sistemi doğrudan autopublish'e bağlanmamalıdır.

Her candidate/cluster için point-in-time snapshot:

```text
14:01 cluster created
14:01 categories = meme 0.81, politics 0.44
14:01 breakoutPrediction = 0.74
14:05 breakoutPrediction = 0.88
14:07 competitorGap[meme] = 1.0
14:12 first meme competitor posted
15:01 final performance
```

Ispatla yayınlamasa bile:

- neyi seçerdi,
- hangi category olarak gördü,
- hangi hesaba yönlendirirdi,
- hangi anda basardı,
- hangi AI route kullanırdı,
- gerçekte ne oldu

saklanmalıdır.

---

# 23. Learned hit model: global + category-specialized

Yeterli shadow data biriktiğinde hardcoded ağırlıklardan çıkılmalıdır.

İlk modeller için CatBoost/LightGBM/XGBoost uygundur.

Ama veri parçalanması kontrol edilmelidir.

## Cold start

Yeni/custom category yeterli data toplamamışsa:

```text
global/shared hit model
+ category features
+ account features
```

kullanılır.

## Yeterli veri sonrası

Kategori yeterli sample'a ulaşınca:

```text
category-specialized model
```

veya global modele category-specific calibration eklenebilir.

Bu sayede 15 custom category açıldığında her biri 30 sample ile kötü model eğitmez.

## Candidate feature snapshot

Genel:

```text
cluster kind
category scores
post/cluster age
source followers
source/category baseline
views
likes
replies
quotes
reposts
velocity windows
acceleration
overperformance
source entropy
broadcast score
cascade score
key-node score
competitor count/gap
account category fit
hour/day
recent account load
saturation
```

Kind-specific feature'lar da eklenir:

```text
news → independent sources, primary source, contradiction
meme → remix count, remix depth, media/template reuse
conversation → reply graph growth
format → replication count
```

## Label'lar

Genel:

```text
became_top_5_percent_cluster
became_top_1_percent_cluster
views_at_1h
views_at_6h
views_at_24h
performance_residual
follower_gain_if_published
```

Category-specific ek label'lar olabilir.

Train/test random split değil time-based olmalıdır.

Aynı cluster train ve test'e sızmamalıdır.

---

# 24. Radar ve Publish Candidate ayrımı

### RADAR

Düşük threshold.

Amaç erken sinyali kaçırmamak.

False positive kabul edilebilir.

### PUBLISH CANDIDATE

Yüksek threshold.

Gerekenler category policy'ye göre değişir:

- yüksek expected value,
- account fit,
- uygun lifecycle,
- category-specific quality gate,
- düşük risk,
- yeterli publish confidence.

Bu sayede meme radar high-recall çalışırken news autopublish high-verification kalabilir.

---

# 25. Source ideology metadata, category gate değil

Source ideology metadata olabilir fakat genel publication gate olmamalıdır.

Kullanım alanları:

- political context,
- corroboration diversity,
- account writing context,
- account-specific source policy.

Ana source seçimi:

- category reputation,
- topic reputation,
- historical hit value,
- provenance,
- account fit

üzerinden yapılmalıdır.

---

# 26. Account-specific learning

Her hesabın ayrı öğrenme profili olmalıdır.

Öğrenilecek kombinasyonlar:

```text
account × category
account × topic
account × source
account × clusterKind
account × hour
account × format
account × openingStyle
account × AI route
```

Aynı cluster farklı hesaplarda farklı EIR üretmelidir.

DB'de feedback `account_id` ile bağlı kalmalıdır.

---

# 27. Draft varyantlarından gerçek öğrenme

AI farklı hesap ve kategorilere farklı draft üretir.

Örneğin aynı source post:

```text
news account → düz, kaynaklı bilgi
meme account → kısa remix/caption
tech account → teknik bağlam
shitpost account → personality-aware angle
```

İleride aynı hesap için kontrollü varyant üretilebilir:

```text
A: sade
B: bağlamlı
C: merak açılışı
```

Aynı event/cluster için aynı hesapta hepsi basılmaz.

Shadow/offline model en iyi varyantı seçer.

Öğrenilecek:

- opening style,
- length,
- punctuation,
- format,
- media/no-media,
- wording family,
- category-specific style.

---

# 28. Publishing transport

Pipeline publishing transport'a bağımlı olmamalıdır.

```ts
interface XPublisher {
  publish(input: PublishInput): Promise<PublishReceipt>;
}
```

Implementasyon:

```text
OfficialXApiPublisher  ← production hedefi
XUsePublisher          ← local/dev fallback gerekiyorsa
```

Reconciliation korunmalıdır. Write receipt tek başına confirmed sayılmamalıdır.

---

# 29. Scheduler tek hız olmayacak

Tek kaynak X olsa da bütün source'lar aynı hızda taranmak zorunda değildir.

### Tier A — Alpha sources

Category/topic bazında yüksek predictive power.

### Tier B — Major competitors / amplifiers

Competitor-gap ve saturation için sık izlenir.

### Tier C — Discovery long tail

Yeni/az hacimli source'lar.

Tarama sıklığı category-specific alpha değerinden öğrenilebilir.

Meme source'u meme kategorisinde Tier A, news kategorisinde Tier C olabilir.

---

# 30. DB / veri katmanı

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
```

Meme/media tarafı gerekirse sonra:

```text
cluster_media_fingerprints
cluster_remix_edges
```

eklenebilir.

Migration tek PR'de yapılmamalıdır.

Mevcut `styleProfile.categories` verisi kaybedilmemelidir. Migration sırasında mevcut string kategoriler gerçek category kayıtlarına dönüştürülmelidir.

---

# 31. KPI'lar

## Selection quality

- Precision@1 / @3 / @5
- top-5% hit recall
- top-1% hit recall
- missed-hit rate
- category-specific hit precision

## Timing

- median relevant-competitor lead time
- P75 lead time
- first-seen → publish latency
- meme seed/remix lead time

## Growth

- reach residual
- follower gain per published cluster
- follower gain per 1M views
- account × category growth
- EIR calibration

## Quality / safety

- false publish rate
- duplicate/repetition rate
- factual correction rate gereken kategorilerde
- category-policy rejection rate
- rights/policy rejection rate

## Automation health

- scan success
- confirmation success
- provider failure per account/category
- AI fallback usage
- cost per selected cluster

---

# Uygulama sırası

## Phase 0 — Haber-only varsayımını kaldır + AI routing

- [ ] `CategoryDefinition` modeli
- [ ] built-in category template'leri
- [ ] custom category CRUD
- [ ] `account_categories`
- [ ] primary/secondary category desteği
- [ ] category weight/threshold/budget
- [ ] mevcut `styleProfile.categories` migration
- [ ] account-level AI route
- [ ] optional account×category AI override
- [ ] model provenance
- [ ] global AI fallback korunur
- [ ] source ideology exact-match publication gate kaldırılır/account policy olur
- [ ] publisher abstraction korunur

### Done when

Aynı scan'deki tek X postu news hesabında `news`, meme hesabında `meme`, teknoloji hesabında `technology` fırsatı olarak farklı skorlanabilir ve hesaplar farklı AI route kullanabilir.

---

## Phase 1 — Time-series ve Overperforming

- [ ] `post_metric_snapshots`
- [ ] 2m/5m/10m/20m/60m feedback
- [ ] source × category × age baselines
- [ ] overperformance
- [ ] velocity windows
- [ ] acceleration

### Done when

Sistem "bu meme hesabının normal 10 dakikalık performansının 7x üstünde" veya "bu news source şu anda normalinden 5x hızlı" diyebilir.

---

## Phase 2 — Opportunity Cluster

- [ ] `opportunity_clusters`
- [ ] kind: event/topic/meme/conversation/format/hybrid
- [ ] observations
- [ ] category multi-label assignment
- [ ] category-aware clustering
- [ ] cluster merge/split audit

### Done when

Bir haber event'i, meme template'i ve tartışma thread'i aynı `Post` abstraction'ına zorlanmadan ayrı cluster türleri olarak izlenebilir.

---

## Phase 3 — Category strategies

- [ ] news strategy
- [ ] meme strategy
- [ ] technology/general topic strategy
- [ ] politics strategy
- [ ] shitpost/personality strategy
- [ ] custom category policy mapping
- [ ] category-specific quality gate
- [ ] category-specific lifecycle

### Done when

Meme'ye haber verification gate'i uygulanmaz; factual news ise meme gibi yalnız engagement'a göre basılmaz.

---

## Phase 4 — Source lineage + source/category reputation

- [ ] source lineage
- [ ] independent source count factual kategorilerde
- [ ] remix graph meme kategorisinde
- [ ] source entropy
- [ ] source-category stats
- [ ] source-topic stats
- [ ] key-node score

### Done when

Aynı lineage bilgisi news'te duplicate/verification sinyali, meme'de remix/cascade sinyali olarak doğru yorumlanır.

---

## Phase 5 — Category-specific Competitor Gap

- [ ] category competitor groups
- [ ] competitor cluster mapping
- [ ] category dominance weights
- [ ] competitor gap
- [ ] first competitor publish/remix timestamp
- [ ] lead-time metrics

### Done when

Sistem news hesabında BPT'yi, meme hesabında ilgili meme competitor'larını doğru referans alır.

---

## Phase 6 — Ayrı skorlar + EIR

- [ ] Emergence Score
- [ ] Virality Score
- [ ] Account Opportunity Score
- [ ] Publish Confidence
- [ ] Broadcast Score
- [ ] Cascade Score
- [ ] Breakout Probability
- [ ] Saturation
- [ ] Expected Incremental Reach
- [ ] Radar vs Publish Candidate

### Done when

Her account×cluster kararının neden seçildiği kategoriye uygun feature'larla açıklanabilir.

---

## Phase 7 — Shadow mode

- [ ] point-in-time feature snapshot
- [ ] category predictions
- [ ] predicted account
- [ ] predicted format
- [ ] predicted publish timestamp
- [ ] future outcome
- [ ] competitor outcome
- [ ] backtest

### Done when

Ispatla hiç post atmadan çalışıp news, meme ve custom kategorilerde hangi fırsatları erken bulduğunu ölçebilir.

---

## Phase 8 — Learned hit models

- [ ] global/shared baseline model
- [ ] category feature support
- [ ] account feature support
- [ ] time-based split
- [ ] cluster leakage guard
- [ ] CatBoost/LightGBM baseline
- [ ] Precision@K
- [ ] calibration
- [ ] category-specialized model yalnız yeterli data varsa
- [ ] heuristic-vs-ML shadow comparison

### Done when

Learned model yeni zaman aralığında category-aware Precision@K/EIR veya lead-time'da heuristic+LLM sistemini geçer.

---

## Phase 9 — Dynamic account×category publishing budget

- [ ] hard cooldown azaltılır
- [ ] account × category budget
- [ ] category lifecycle saturation
- [ ] recent performance feedback
- [ ] same-cluster anti-spam
- [ ] category-specific high-EV override

### Done when

News hesabı yoğun günde gerekli sayıda post atarken meme hesabı yalnız güçlü meme fırsatlarını seçebilir.

---

## Phase 10 — Production publisher

- [ ] `XPublisher` interface
- [ ] official X write implementation
- [ ] x-use izolasyonu
- [ ] reconciliation korunur
- [ ] rate-limit awareness
- [ ] account-specific publisher health

### Done when

Hit engine publishing transport'tan bağımsızdır.

---

# Öncelik dışı

Şimdilik yapılmamalı:

- haber sitesi,
- CMS,
- newsletter,
- Reddit/RSS/Telegram ingestion,
- gereksiz agent framework,
- UI redesign uğruna scoring işini geciktirmek,
- LLM büyütünce hit detection kendiliğinden düzelir varsayımı,
- bütün kategorilere tek verification/publishing policy uygulamak,
- custom category'yi yalnız string tag olarak bırakmak,
- yeterli data olmadan her category için ayrı ML model eğitmek,
- Hawkes/neural virality gibi ileri modelleri time-series data olmadan eklemek,
- X'in gizli internal ranking score'unu taklit ettiğimizi iddia etmek.

---

# Son ürün tanımı

Ispatla'nın hedef hali:

> **Yalnızca X üzerindeki source, competitor, conversation ve engagement ağını sürekli izleyen; postları haber olayları, meme/remix zincirleri, topic/conversation trendleri ve diğer opportunity cluster türlerinde birleştiren; her cluster'ı kategoriye göre farklı kurallarla değerlendiren; her X hesabı için farklı category mix, AI provider/model, stil, source policy ve publishing budget kullanabilen; acceleration, overperformance, source/category reputation, competitor gap ve account-specific geçmiş performanstan hit olasılığını tahmin eden; en yüksek beklenen ek erişime sahip içeriği doğru hesapta doğru format ve zamanda yayınlayan ve sonuçlarından sürekli öğrenen X-only otonom hit engine.**

Ana moat:

```text
X-only signal graph
+ category-aware opportunity clustering
+ custom categories
+ account × category learning
+ account-specific AI routing
+ time-series acceleration
+ age-normalized overperformance
+ source-category/topic reputation
+ category-specific competitor gap
+ account-specific performance residual
+ verified publishing feedback
```

AI metin üretimi tek başına moat değildir.

Haber de tek başına ürün değildir.

Moat, **X'te hangi fırsatın doğduğunu kategoriye göre doğru anlamak; bunu hangi hesabın kitlesine hangi formatta ve ne zaman vermenin en yüksek incremental reach üreteceğini zamanla diğer hesaplardan daha iyi öğrenmek** olacaktır.