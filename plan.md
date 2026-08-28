# Ispatla — X-Only Otonom Haber Hesabı Planı

Bu belge Ispatla'nın bundan sonraki ürün yönünü tanımlar.

Amaç bir haber sitesi kurmak değildir. Amaç, **yalnızca X üzerindeki sinyalleri kullanarak bir veya daha fazla X haber hesabını mümkün olduğunca otonom biçimde büyüten bir newsroom/growth engine** oluşturmaktır.

Ana soru şudur:

> **Hangi X olayını, hangi hesapta, hangi anda, hangi biçimde yayınlarsak beklenen ek erişim ve takipçi kazanımı en yüksek olur?**

Ispatla'nın başarı metriği X'in creator payout'u değildir. Ana hedefler:

- rakiplerden önce güçlü olayları yakalamak,
- yanlış/kalitesiz otomatik yayını düşük tutmak,
- hesap başına beklenen erişimi artırmak,
- takipçi kazanımını artırmak,
- kendi performansından öğrenerek seçim kalitesini zamanla yükseltmek.

---

## 1. Kesin kapsam

### Veri kaynağı: yalnız X

Ispatla'nın haber/radar veri kaynağı **sadece X** olacaktır.

Kapsam dışı:

- Reddit
- Telegram
- RSS
- haber sitesi scraping'i
- GDELT
- YouTube
- Bluesky
- harici sosyal listening kaynakları

Bu karar bilinçlidir. Sistem X ekosistemini olabildiğince iyi modellemeye odaklanacaktır.

X içinde kullanılabilecek sinyal türleri:

- takip edilen kaynak hesapların original postları,
- quote post ilişkileri,
- reply ilişkileri,
- mention ilişkileri,
- repost/quote yayılımı,
- public engagement metrikleri,
- public view metrikleri mevcutsa views,
- yazarın takipçi ve profil metrikleri,
- competitor postları,
- event içindeki kaynaklar arası bağlantılar,
- postların zaman içindeki performans snapshot'ları.

---

## 2. Hesap bazlı AI routing

Mevcut global AI provider/model ayarı kaldırılmamalı; **fallback/default** olarak kalmalı. Buna ek olarak her yayın hesabı kendi AI routing ayarına sahip olmalıdır.

Bir hesap örneğin:

```text
@hesap_a
analysis provider: xAI
analysis model: Grok
writing provider: xAI
writing model: Grok
review provider: OpenAI
review model: Luna/Terra
```

başka bir hesap:

```text
@hesap_b
analysis provider: OpenAI
analysis model: Luna
writing provider: OpenAI
writing model: Luna
review provider: OpenAI
review model: Terra
```

şeklinde çalışabilmelidir.

Bunun nedeni yalnız model kalitesi değildir. Farklı hesapların:

- politik/editoryal ekseni,
- içerik hassasiyeti,
- sansür/tutuculuk toleransı,
- dil/tarz ihtiyacı,
- maliyet bütçesi,
- latency ihtiyacı

farklı olabilir.

### Account AI config

`accounts` veya ilişkili account settings yapısına aşağıdaki mantık eklenmeli:

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

1. Hesapta route tanımlıysa hesap ayarı kullanılır.
2. Tanımlı değilse global AI provider/model fallback'i kullanılır.
3. Provider/model erişilemiyorsa yayın fail-open olmamalı; hesap ayarındaki fallback denenir.
4. Fallback de yoksa otomatik yayın fail-closed kalır.
5. Hangi modelin hangi kararı verdiği DB'de provenance olarak tutulur.
6. Analysis, writing ve review aynı provider olmak zorunda değildir.
7. Source scoring için global veya account-independent model kullanılabilir; **publish kararı ve draft üretimi hesap route'una bağlı olmalıdır**.

### Grok kullanımı

Grok gibi daha az kısıtlayıcı davranabilen bir model bazı hesaplar için analysis/writing engine olabilir. Ancak modelin daha az çekingen olması **verification gate'lerini gevşetmemelidir**.

Model:

- event/claim extraction,
- relevance,
- novelty,
- category,
- tone,
- draft üretimi

yapabilir.

Model tek başına:

- verification bypass,
- cooldown bypass,
- risk bypass,
- rights bypass,
- duplicate/event-update bypass

yapamaz.

---

## 3. Merkezi veri tipi: Post değil Event

Mevcut sistem post odaklıdır. Yeni sistemde ana soyutlama **Event** olmalıdır.

Bir X postu yalnızca bir event'e ait observation'dır.

Önerilen yapı:

```text
Event
 ├─ Claims
 ├─ Observations
 │   ├─ source A post
 │   ├─ source B quote
 │   ├─ source C reply
 │   └─ competitor post
 ├─ Entities
 ├─ Source lineage
 ├─ Metric snapshots
 ├─ Verification state
 ├─ Virality state
 └─ Publishing history
```

### Event

Örnek alanlar:

```ts
type Event = {
  id: number;
  eventType: string;
  summary: string;
  firstSeenAt: number;
  lastSeenAt: number;
  status: "radar" | "candidate" | "published" | "developing" | "resolved" | "discarded";
  confidence: number;
  novelty: number;
  risk: number;
  broadcastScore: number;
  cascadeScore: number;
  breakoutProbability: number;
  competitorGap: number;
};
```

### Observation

```ts
type EventObservation = {
  eventId: number;
  postExternalId: string;
  sourceHandle: string;
  observedAt: number;
  observationType: "original" | "quote" | "reply" | "mention" | "competitor";
  parentExternalId?: string;
};
```

### Claim

Event içindeki her yeni bilgi ayrı claim olarak tutulmalı.

Örnek:

```text
Event: büyük yangın

Claim 1: yangın başladı
Claim 2: tahliye kararı verildi
Claim 3: iki mahalle etkilendi
Claim 4: kontrol altına alındı
```

Bu sayede aynı event için daha önce post atılmış olsa bile **gerçek major update** tekrar yayınlanabilir.

---

## 4. Semantic event clustering

Mevcut `clusterKey()` kelime tabanlı yaklaşımı fallback/deterministic fingerprint olarak kalabilir; ana event eşleştirme yöntemi olmamalıdır.

Amaç:

```text
"M2 hattında seferler durdu"
```

ile

```text
"İstanbul metrosunda teknik arıza nedeniyle yolcular tahliye ediliyor"
```

ifadelerini aynı event altında toplayabilmek.

### Önerilen pipeline

```text
new X post
  ↓
cheap lexical candidate retrieval
  ↓
entity/topic extraction
  ↓
semantic event comparison
  ↓
existing event match OR new event
```

İlk sürümde embedding şart değildir. Hesabın analysis modeli structured JSON ile:

- entities,
- event type,
- location,
- actors,
- normalized claim,
- likely same-event candidates

çıkarabilir.

Daha sonra local embedding veya provider embedding eklenebilir.

### Acceptance

- Aynı olayın farklı cümlelerle anlatılan X postları yüksek oranda aynı event'e bağlanmalı.
- Farklı olaylar sadece ortak kelime nedeniyle birleşmemeli.
- Event merge/split işlemleri audit edilebilir olmalı.

---

## 5. Source lineage: bağımsız kaynak sayısını doğru ölç

Dört X hesabının aynı orijinal kaynağı tekrar etmesi dört bağımsız kanıt değildir.

Örnek:

```text
AA
 ├─ BPT
 ├─ Pusholder
 ├─ DarkWeb
 └─ ZAM
```

Burada `independentSourceCount = 1` kabul edilmelidir.

Ispatla quote/reply/mention ve metin/event benzerliğinden **source lineage** tahmini üretmelidir.

Tutulacak metrikler:

- `independentSourceCount`
- `sourceEntropy`
- `originSourceCount`
- `aggregatorCount`
- `primarySourcePresent`
- `sourceDiversity`

Bu metrikler hem verification hem breakout tahminine girmelidir.

---

## 6. Hit yerine dört ayrı skor

Tek `hitScore` veya tek AI `score` yeterli değildir.

Yeni sistem dört farklı problemi ayrı ölçmelidir.

### 6.1 Emergence Score

Soru:

> X'te gerçekten yeni bir olay mı ortaya çıkıyor?

Örnek feature'lar:

- event age,
- son 2/5/10 dakikadaki yeni observation sayısı,
- yeni source sayısı,
- yeni independent source sayısı,
- quote/reply/mention burst,
- baseline'a göre mention anomaly,
- source diversity,
- yeni entity kombinasyonu,
- novelty.

### 6.2 Virality Score

Soru:

> Bu event X'te yayılmaya devam edecek mi?

Feature'lar:

- velocity,
- acceleration,
- source overperformance,
- key-node participation,
- broadcast score,
- cascade score,
- source entropy,
- repost/quote/reply büyümesi,
- event-level interaction growth.

### 6.3 Account Opportunity Score

Soru:

> Bu event bizim belirli hesabımızda iyi çalışır mı?

Feature'lar:

- account category fit,
- account topic history,
- account historical residual,
- hour-of-day fit,
- weekday fit,
- competitor gap,
- format history,
- source-account history,
- account follower state,
- recent publishing load.

Her hesap için farklı değer çıkar.

Aynı event:

```text
@genelhaber: 93
@teknoloji: 18
@politikhaber: 72
```

olabilir.

### 6.4 Verification Confidence

Soru:

> Otomatik yayın için yeterince güvenilir mi?

Feature'lar:

- independent sources,
- primary source,
- source topic reputation,
- contradictions,
- source lineage,
- claim agreement,
- sensitive/legal flags,
- source deletion/suspension anomalies.

---

## 7. Acceleration ve time-series snapshot'ları

Tek seferlik metrics yeterli değildir.

Her önemli candidate/event için zaman serisi tutulmalıdır.

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

Kaynak post için:

- views,
- likes,
- replies,
- reposts,
- quotes,
- follower count snapshot

tutulmalıdır.

Event için:

- observation count,
- independent source count,
- unique source count,
- total engagement,
- competitor count

tutulmalıdır.

### Velocity

```text
velocity_window = delta(engagement) / delta(time)
```

### Acceleration

```text
acceleration = recent_velocity - previous_velocity
```

ve normalize edilmiş sürümü:

```text
normalized_acceleration =
  (v_recent - v_previous) / max(abs(v_previous), epsilon)
```

Yüksek mevcut hızdan çok **hızdaki ani artış** early-hit için değerli sinyal olacaktır.

---

## 8. Age-normalized Overperforming

Her kaynak hesabın normal performansı öğrenilmelidir.

Ama basit 30 günlük final engagement ortalaması yetmez. Post yaşı hesaba katılmalıdır.

Örnek baseline:

```text
@sourceA

2 dakika median engagement: 4
5 dakika median engagement: 12
10 dakika median engagement: 31
20 dakika median engagement: 67
60 dakika median engagement: 155
```

Yeni post 10 dakikada 217 engagement aldıysa:

```text
overperformance_10m = 217 / 31 = 7.0x
```

Bu skor follower count'tan daha anlamlı bir anomaly sinyali olabilir.

Daha sonra baseline şu seviyeye çıkarılmalıdır:

```text
source × topic × age_bucket
```

Örnek:

```text
@sourceA / deprem / 10m
@sourceA / siyaset / 10m
@sourceA / magazin / 10m
```

---

## 9. Source-topic reputation

Tek genel source score yeterli değildir.

Bir hesap bir konuda çok iyi, başka konuda kötü olabilir.

Örnek:

```text
@spor_muhabiri
transfer: 97
siyaset: 14
deprem: 3

@yerel_muhabir
yerel olay: 93
ulusal siyaset: 26
```

Tutulacak yapı:

```text
source_topic_stats
```

Feature'lar:

- first-to-event rate,
- hit-event participation rate,
- correction/contradiction rate,
- downstream competitor pickup rate,
- historical source overperformance,
- verification success.

Bu score zamanla gerçek performanstan öğrenmelidir; yalnız LLM görüşü olmamalıdır.

---

## 10. Broadcast Score ve Cascade Score ayrı olsun

Virality tek tip değildir.

### Broadcast

Çok güçlü tek hesap bir olay başlatabilir.

Örnek:

```text
çok yüksek authority
çok yüksek novelty
çok yüksek topic importance
ama source diversity düşük
```

Bu event yine anında önemli olabilir.

### Cascade

Küçük/orta hesaplar arasında olay hızla yayılabilir.

Örnek:

```text
çok sayıda farklı source
yüksek acceleration
yüksek source entropy
key nodes sonradan katılıyor
```

Bu nedenle:

```text
broadcastScore
cascadeScore
```

ayrı tutulmalı ve `breakoutProbability` ikisinden yararlanmalıdır.

---

## 11. Competitor Gap gerçek publish feature'ı olsun

Mevcut competitor tracking sadece analytics değildir; yayın kararının merkezine girmelidir.

Her event için izlenen competitor hesaplar kontrol edilir.

Örnek:

```text
BPT       ❌
Pusholder ❌
DarkWeb   ❌
Muhbir    ❌
ZAM       ❌
```

ise `competitorGap` yüksek.

Büyük hesaplar olayı yayınladıkça değer düşer.

Örnek basit sürüm:

```text
competitorGap = 1 - weightedCompetitorCoverage
```

Ama competitor ağırlıkları eşit olmamalı.

Bir hesabın:

- takipçi sayısı,
- kategori performansı,
- ilgili konuda historical dominance,
- ortalama reach'i

hesaba katılabilir.

### Lead-time metriği

Her yayınlanan event için:

```text
our_publish_at
first_competitor_publish_at
lead_time_seconds
```

tutulmalıdır.

Ana KPI'lardan biri:

> **Median competitor lead time**

olmalıdır.

---

## 12. Key-node prediction

Bazı X hesapları belirli kategorilerde büyük olaylardan önce görünür.

Her source için zamanla:

```text
P(event becomes hit | source participates early, topic)
```

öğrenilmelidir.

Örnek:

```text
@foo
siyaset: 0.72
deprem: 0.11
transfer: 0.04
```

Bu feature `Virality Score` içine girmelidir.

Takipçi sayısı tek başına key-node olmak için yeterli değildir.

---

## 13. Event lifecycle ve major update

Mevcut `hasPublishedCluster()` yaklaşımı aynı event için bütün sonraki yayınları kesebilir.

Yeni yapı:

```text
RADAR
  ↓
CANDIDATE
  ↓
BREAKING / FIRST PUBLISH
  ↓
DEVELOPING
  ↓
MAJOR UPDATE
  ↓
RESOLVED
```

Aynı event tekrar yayınlanabilir ancak **claim delta** yeterince büyük olmalıdır.

Örnek major update kriterleri:

- yeni doğrulanmış can kaybı,
- resmi açıklama,
- gözaltı/tutuklama,
- kararın geri çekilmesi,
- olayın çözülmesi,
- önemli sayı değişimi,
- yeni aktör,
- sonuç/nihai durum.

LLM `major_update_candidate` çıkarabilir fakat deterministic delta gate uygulanmalıdır.

---

## 14. Breaking flag AI'ya tek başına bırakılmayacak

AI şu çıktıyı verebilir:

```text
breakingCandidate: true
```

ancak cooldown/daily-budget bypass yalnız deterministic gate ile mümkündür.

Örnek:

```text
breakingCandidate
AND eventAge < threshold
AND risk < threshold
AND verificationConfidence >= threshold
AND (
  primarySourcePresent
  OR independentSourceCount >= minimum
  OR broadcastScore >= veryHighThreshold
)
```

Böylece daha agresif bir model (örneğin Grok) seçilmiş olsa dahi güvenlik kapıları değişmez.

---

## 15. Dinamik publishing budget

Sabit 45 dakikalık cooldown ve kaba günlük limit production haber hesabı için yetersizdir.

Yerine `attention budget` / `publishing budget` kullanılmalıdır.

Budget faktörleri:

- event quality,
- account recent activity,
- son postların performansı,
- aynı kategoride saturation,
- follower count,
- current news density,
- competitor pressure,
- duplicate risk.

Normal gündem:

```text
az sayıda yüksek EV post
```

Yoğun breaking gündem:

```text
daha yüksek frekans
```

Ama aynı event spam'i claim-delta gate ile önlenir.

---

## 16. Expected Incremental Reach ana objective olsun

Sistemin ana seçim metriği uzun vadede şu olmalıdır:

```text
Expected Incremental Reach
```

Kavramsal olarak:

```text
P(event becomes hit)
× expected account performance
× competitor opportunity
× verification confidence
× timing value
```

Daha pratik ilk sürüm:

```text
EIR =
    breakoutProbability
  * accountOpportunity
  * verificationConfidence
  * competitorGap
```

Tüm değerler 0–1 normalize edilirse sonuç anlaşılır kalır.

Bu skor X'in kendi internal ranking score'u olduğunu iddia etmemelidir.

---

## 17. Feedback: raw views yerine residual

Ham views tek başına öğrenme label'ı değildir.

Beklenen performansa göre normalize edilmelidir.

```text
performanceResidual = actual / expected
```

Örnek:

```text
expected 1h views: 70k
actual 1h views: 210k
residual: 3.0x
```

Expected baseline şu feature'lardan öğrenilebilir:

- account,
- follower count,
- topic,
- event type,
- time of day,
- weekday,
- media/no media,
- post length,
- opening style,
- source,
- breaking/non-breaking,
- previous publishing load.

Bu residual hem source hem topic hem account modelini günceller.

---

## 18. X engagement türlerini ayrı label olarak tut

Mevcut ham engagement toplamı:

```text
likes + replies + reposts + quotes
```

erken heuristic için kalabilir.

Ama feedback modelinde bunlar ayrı tutulmalıdır:

- like rate,
- reply rate,
- repost rate,
- quote rate,
- views,
- follower delta,
- mümkünse bookmark/share gibi erişilebilir public/API sinyalleri.

Ama X'in açık kaynak ranking ağırlıkları **ham engagement değerlerine doğrudan uygulanmamalıdır**. Bunlar X'in kendi predicted-action probability sistemine aittir.

---

## 19. AI'nın rolü: feature extractor + writer

AI tek başına `hitScore = 91` veren oracle olmamalıdır.

AI görevleri:

- event type,
- entities,
- normalized claim,
- novelty,
- categories,
- source context,
- contradiction extraction,
- breaking candidate,
- major-update candidate,
- account fit yorumları,
- özgün draft üretimi,
- gerektiğinde ikinci görüş.

Deterministik / learned katmanın görevleri:

- acceleration,
- overperformance,
- source diversity,
- competitor gap,
- publishing budget,
- verification threshold,
- event lifecycle,
- expected performance,
- final publish ordering.

---

## 20. Shadow mode zorunlu

Yeni hit sistemi doğrudan autopublish'e bağlanmamalıdır.

Önce `shadow mode` çalışmalıdır.

Her candidate için o anki feature snapshot saklanır:

```text
14:01 event created
14:01 breakoutPrediction = 0.74
14:05 breakoutPrediction = 0.88
14:07 competitorGap = 1.0
14:12 first competitor posted
15:01 final observed performance
```

Ispatla post atmasa bile:

- hangi event'i seçerdi,
- hangi hesapta seçerdi,
- hangi zamanda yayınlardı,
- gerçekte ne oldu

saklanmalıdır.

Böylece gerçek backtest yapılabilir.

---

## 21. Learned hit model

Yeterli shadow data biriktiğinde hardcoded ağırlıklardan çıkılmalıdır.

İlk ML modeli için transformer veya LLM gerekli değildir.

Tabular feature set için:

- CatBoost,
- LightGBM,
- XGBoost

gibi gradient-boosted tree yaklaşımı uygundur.

### Candidate feature snapshot

Örnek:

```text
post/event age
source followers
source baseline
views
likes
replies
quotes
reposts
velocity_2m
velocity_5m
velocity_10m
acceleration
overperformance
independent_source_count
source_entropy
broadcast_score
cascade_score
key_node_score
competitor_count
competitor_gap
source_topic_reputation
account_topic_fit
hour
weekday
recent_account_load
```

### Label'lar

Birden fazla label tutulmalı:

```text
became_top_5_percent_event
became_top_1_percent_event
views_at_1h
views_at_6h
views_at_24h
performance_residual_at_1h
performance_residual_at_6h
competitor_pickup_within_15m
competitor_pickup_within_60m
follower_gain_if_published
```

### Train/test

Random split kullanılmamalıdır.

Zaman bazlı split:

```text
oldest → train
middle → validation
newest → test
```

Event leakage önlenmelidir; aynı event train ve test'e bölünmemelidir.

---

## 22. Radar ve Publish candidate ayrımı

Sistem yalnız yüksek-precision candidate göstermemelidir.

İki seviye olmalı:

### RADAR

Düşük threshold.

Amaç erken sinyali kaçırmamak.

False positive kabul edilebilir.

### PUBLISH CANDIDATE

Yüksek threshold.

Amaç otomatik yayına uygun event.

Gerekenler:

- yeterli verification,
- yüksek expected value,
- düşük risk,
- account fit,
- event lifecycle uygunluğu.

Bu sayede radar recall yüksek tutulurken autopublish precision yüksek kalır.

---

## 23. Kaynak ideolojisi publication gate olmamalı

Source ideology bilgisi metadata olarak kalabilir fakat genel haber hesabında exact ideology match nedeniyle source elenmemelidir.

Kullanım alanları:

- bias-awareness,
- corroboration diversity,
- account writing context,
- siyasi eventlerde farklı eksenlerden doğrulama.

Ana source gate:

- reliability,
- topic reputation,
- provenance,
- historical verification,
- event relevance,
- account category fit

olmalıdır.

Partizan/niche hesaplar isterse ayrıca account-specific source policy tanımlayabilir.

---

## 24. Rakipleri yalnız follower sayısıyla ağırlıklandırma

Competitor ağırlığı kategori bazlı öğrenilmelidir.

Örnek:

```text
BPT
politika dominance: 0.7
magazin dominance: 0.9
teknoloji dominance: 0.4

Pusholder
politika dominance: 0.8
magazin dominance: 0.6
```

Bir eventte competitor gap hesabı ilgili kategori dominance'ını kullanabilir.

Ayrıca:

```text
P(competitor posts event within 15m | current features)
```

ayrı prediction target olabilir.

Bu, "hit olacak mı?" sorusundan farklı ve çok değerlidir:

> **Rakipler bunu birazdan keşfedecek mi?**

---

## 25. Account-specific learning

Her yayın hesabının ayrı öğrenme profili olmalıdır.

Aynı event için farklı hesaplar:

- farklı AI route,
- farklı style profile,
- farklı category fit,
- farklı expected reach,
- farklı daily budget,
- farklı source policy

kullanabilmelidir.

DB'de bütün feedback `account_id` ile bağlı kalmalıdır.

Öğrenilecek kombinasyonlar:

```text
account × topic
account × source
account × eventType
account × hour
account × format
account × openingStyle
```

---

## 26. Draft varyantlarından gerçek öğrenme

AI farklı hesaplara farklı draft üretebilir.

İleride aynı hesap için de kontrollü varyant generation uygulanabilir:

```text
Variant A: sade başlık
Variant B: kısa bağlam
Variant C: soru/merak açılışı
```

Ancak aynı event için aynı hesapta hepsini yayınlamak yok.

Shadow/offline scoring ile en iyi tahmin edilen varyant seçilir.

Sonuçtan:

- opening style,
- length,
- punctuation,
- source attribution,
- media/no-media,
- wording pattern

öğrenilir.

Ama aşırı clickbait veya yanıltıcı metin quality gate tarafından engellenir.

---

## 27. Publishing transport

Uzun vadeli production hedefi X'in izin verdiği resmi write yolunu kullanmak olmalıdır.

Abstraction:

```ts
interface XPublisher {
  publish(input: PublishInput): Promise<PublishReceipt>;
}
```

Implementasyonlar:

```text
OfficialXApiPublisher  ← production hedefi
XUsePublisher          ← development/local fallback gerekiyorsa
```

Pipeline publisher implementasyonuna bağımlı olmamalıdır.

Mevcut reconciliation mantığı korunmalı; write receipt tek başına "confirmed" sayılmamalıdır.

---

## 28. Scheduler: 5 dakika tek hız olmamalı

Tek kaynak X olsa da bütün X hesaplarının aynı hızda taranması gerekmiyor.

Source tier sistemi:

### Tier A — Alpha sources

- çok yüksek source-topic reputation,
- geçmişte erken hit yakalayan hesaplar,
- kritik resmi/kişisel hesaplar.

Daha sık taranır.

### Tier B — Major aggregators / competitors

- BPT,
- Pusholder,
- DarkWeb,
- diğer büyük haber hesapları.

Rakip-gap ve confirmation için sık taranır.

### Tier C — Discovery long tail

- yeni keşfedilmiş hesaplar,
- düşük volume sources.

Daha seyrek taranır.

Tarama sıklığı zamanla source alpha değerinden öğrenilebilir.

---

## 29. Yeni DB tabloları / veri katmanı

Önerilen yeni tablolar:

```text
events
event_observations
event_claims
event_entities
event_metric_snapshots
post_metric_snapshots
source_topic_stats
source_lineage
account_topic_stats
account_source_stats
account_format_stats
competitor_event_coverage
hit_predictions
shadow_decisions
model_outcomes
account_ai_routes
```

İlk migration minimum tutulabilir; bütün yapı tek PR'de yapılmamalıdır.

---

## 30. Ölçüm KPI'ları

Sistemi yalnız average views ile değerlendirme.

Ana KPI'lar:

### Selection quality

- `Precision@1`
- `Precision@3`
- `Precision@5`
- top-5% hit recall
- top-1% hit recall
- missed-hit rate

### Timing

- median competitor lead time
- P75 competitor lead time
- event first-seen → publish latency

### Safety / quality

- false publish rate
- correction rate
- duplicate publish rate
- blocked-by-quality rate
- contradictory-event publish rate

### Growth

- expected-vs-actual reach residual
- follower delta per 1M views
- follower gain per published event
- account category growth

### Automation health

- scan success rate
- publish confirmation rate
- AI provider failure rate per account
- fallback usage rate
- cost per selected event

---

# Uygulama sırası

## Phase 0 — AI routing ve sınırları düzelt

Önce mevcut sistemi kırmadan temel kontrol yüzeyini hazırla.

- [ ] `account_ai_routes` veya account JSON route desteği
- [ ] analysis/writing/review provider ayrımı
- [ ] account-level fallback provider/model
- [ ] model provenance DB kaydı
- [ ] global AI settings fallback olarak korunur
- [ ] Grok/OpenAI-compatible provider desteği account route ile çalışır
- [ ] AI `breaking` flag tek başına publish-limit bypass edemez
- [ ] source ideology exact-match publication gate kaldırılır veya account policy'ye dönüştürülür
- [ ] publisher interface çıkarılır

### Done when

İki farklı otomatik hesap aynı scan sırasında aynı event'i kendi AI provider/model route'uyla bağımsız değerlendirebilir ve draft üretebilir.

---

## Phase 1 — Time-series ve Overperforming

En hızlı hit-quality kazancı.

- [ ] `post_metric_snapshots`
- [ ] 2m/5m/10m/20m/60m feedback schedule
- [ ] source age-bucket baselines
- [ ] `overperformance`
- [ ] velocity windows
- [ ] acceleration
- [ ] analytics'te time-series inspection

### Done when

Bir source postu için sistem "10 dakikalık normal performansının 6.8x üstünde ve hızlanıyor" diyebilir.

---

## Phase 2 — Event / Claim / Observation

- [ ] `events`
- [ ] `event_observations`
- [ ] `event_claims`
- [ ] lexical candidate retrieval
- [ ] AI semantic event assignment
- [ ] event merge audit
- [ ] claim-delta detection
- [ ] major update lifecycle

### Done when

Aynı olayın farklı X hesaplarındaki farklı ifadeleri tek event altında toplanır ve önemli yeni claim geldiğinde tekrar publish edilebilir.

---

## Phase 3 — Source lineage ve verification

- [ ] original/parent source graph
- [ ] independent source count
- [ ] source entropy
- [ ] aggregator dependency
- [ ] primary-source flag
- [ ] contradiction extraction
- [ ] verification confidence

### Done when

BPT + Pusholder + DarkWeb aynı kaynağı tekrar ediyorsa sistem bunu üç doğrulama değil tek origin olarak sayar.

---

## Phase 4 — Competitor Gap

- [ ] competitor post → event mapping
- [ ] category-specific competitor weights
- [ ] competitor gap
- [ ] first competitor publish timestamp
- [ ] lead-time metrics
- [ ] competitor gap publish scoring'e girer

### Done when

Sistem "event güçlü, henüz hiçbir major competitor basmadı" durumunu açık bir publish avantajı olarak kullanır.

---

## Phase 5 — Source-topic reputation ve key nodes

- [ ] topic-level source stats
- [ ] early-event participation rate
- [ ] downstream pickup rate
- [ ] key-node score
- [ ] source-topic historical performance

### Done when

Sistem bir hesabın örneğin transfer haberinde alpha source olduğunu fakat siyaset için güvenilir/predictive olmadığını ayırabilir.

---

## Phase 6 — Dört skor + Expected Incremental Reach

- [ ] Emergence Score
- [ ] Virality Score
- [ ] Verification Confidence
- [ ] Account Opportunity Score
- [ ] Broadcast Score
- [ ] Cascade Score
- [ ] Breakout Probability
- [ ] Expected Incremental Reach
- [ ] Radar vs Publish Candidate ayrımı

### Done when

Her event için tek anlaşılmaz AI puanı yerine hangi sebeple seçildiği açıklanabilir.

---

## Phase 7 — Shadow mode

- [ ] her event için point-in-time feature snapshot
- [ ] predicted decision
- [ ] predicted account
- [ ] predicted publish timestamp
- [ ] future outcomes
- [ ] competitor outcomes
- [ ] backtest ekranı/raporu

### Done when

Ispatla hiç post atmadan bir hafta çalıştırılıp "hangi hitleri erken buldu, hangilerini kaçırdı" ölçülebilir.

---

## Phase 8 — Learned hit model

- [ ] training dataset export
- [ ] time-based split
- [ ] event leakage guard
- [ ] CatBoost/LightGBM baseline
- [ ] top-K evaluation
- [ ] calibration
- [ ] shadow model serving
- [ ] heuristic-vs-ML A/B comparison

### Done when

Learned model yeni tarih aralığında mevcut heuristic+LLM seçimine göre Precision@K ve/or lead-time'da anlamlı iyileşme gösterir.

---

## Phase 9 — Dynamic publishing budget

- [ ] hard 45m cooldown yerine account attention budget
- [ ] event-level saturation
- [ ] recent performance feedback
- [ ] high-confidence breaking override
- [ ] same-event anti-spam
- [ ] account-specific rate policy

### Done when

Yoğun haber gününde sistem kaliteli farklı eventleri kaçırmadan yayınlayabilir ama aynı olayı spamlemez.

---

## Phase 10 — Production publisher

- [ ] `XPublisher` interface
- [ ] official X write implementation
- [ ] x-use implementation izolasyonu
- [ ] reconciliation korunur
- [ ] rate-limit awareness
- [ ] account-specific publisher health

### Done when

Hit engine'in geri kalanı publishing transport değişiminden etkilenmez.

---

# Öncelik dışı şeyler

Şimdilik yapılmamalı:

- daha büyük dashboard redesign,
- haber sitesi,
- CMS,
- newsletter,
- Reddit/RSS/Telegram ingestion,
- gereksiz agent framework,
- LLM'yi büyütüp hit score'un düzeleceğini varsaymak,
- Hawkes process gibi ileri modelleri yeterli time-series data olmadan eklemek,
- çok karmaşık neural virality modeli,
- X'in gizli ranking score'unu taklit ettiğimizi iddia etmek.

---

# Son ürün tanımı

Ispatla'nın hedef hali:

> **X üzerindeki haber, muhabir ve rakip hesap ağını sürekli izleyen; yeni olayları event seviyesinde birleştiren; kaynak kökenini ve bağımsız doğrulamayı ayıran; acceleration, overperformance, competitor gap ve account-specific geçmiş performanstan patlama ihtimalini tahmin eden; her X hesabı için farklı AI provider/model kullanabilen; en yüksek beklenen ek erişime sahip olayı doğru hesapta doğru anda otomatik yayınlayan ve sonuçlarından sürekli öğrenen X-only otonom newsroom engine.**

Ana moat:

```text
X-only source graph
+ event clustering
+ time-series acceleration
+ age-normalized overperformance
+ source-topic reputation
+ competitor gap
+ account-specific AI routing
+ account-specific performance learning
+ verified publishing feedback
```

AI metin üretimi tek başına moat değildir.

Moat, **hangi olayı rakiplerden önce seçtiğin ve bunu hangi hesapta ne zaman yayınladığını zamanla daha iyi öğrenebilmen** olacaktır.
