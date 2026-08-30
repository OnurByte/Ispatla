# x algorithmı: haber hesabı için derinlemesine kaynak incelemesi

Bu belge, X’in açık kaynak öneri algoritması deposunun incelenmesinden çıkan teknik bulguları ve bu bulguların yeni bir haber hesabı için pratik karşılığını tek yerde toplar.

İnceleme tarihi: 2026-08-21  
İncelenen depo: xai-org/x-algorithm  
İncelenen dal: <code>main</code>  
İncelenen sabit commit: <code>d0cef2f943084ee0d4310378031c9c2c37d67f12</code>  
Commit tarihi: 2026-08-20 20:22:58 UTC  
İncelenen commit bağlantısı: [d0cef2f](https://github.com/xai-org/x-algorithm/commit/d0cef2f943084ee0d4310378031c9c2c37d67f12)

Bu metin kaynak kodunu, README’leri, testleri, yapılandırmaları ve yayınlanan teknik açıklamaları birlikte okur. Açık kaynak depo üretimde kullanılan tüm model checkpoint’lerini, canlı deney kovalarını, kullanıcıya özel skorları, bazı Grok prompt’larını ve bazı Botmaker eşiklerini göstermediği için aşağıdaki iki kategori korunmuştur:

- Kaynak koduyla doğrudan doğrulanabilen davranışlar
- Koddan makul biçimde çıkarılan fakat üretim dağıtımıyla ayrıca doğrulanamayan davranışlar

## kısa sonuç

X’in “For You” akışı tek bir skor fonksiyonu değildir. Genel akış şu şekildedir:

1. Birden fazla aday kaynağı çalışır.
2. Adaylar hidratlanır ve görünürlük, yaş, tekrar, sosyal grafik ve güvenlik filtrelerinden geçer.
3. Phoenix ana retrieval katmanı semantik adaylar getirir.
4. Phoenix ve diğer scorer’lar kullanıcı-eylem olasılıklarını tahmin eder.
5. Eylem olasılıkları iş ağırlıklarıyla tek skora çevrilir.
6. Yazar soğuk başlangıç ve yazar çeşitliliği uygulanır.
7. OON içerik, reply/repost ilişkisi, görünürlük ve kalite kuralları uygulanır.
8. VMRanker/DPP gibi çeşitlilik katmanları benzer içeriklerin yan yana yığılmasını azaltabilir.
9. Dış For You blender’ı organik adayların arasına reklam, “who to follow”, prompt, anket ve başka modüller ekleyebilir.
10. Kullanıcıya gösterimden sonra served/seen kayıtları ve yan etkiler işlenir.

Yeni bir haber hesabı için bunun pratik anlamı şudur:

- “İlk Favorite” ayrı bir kalite sınıfı değil, Phoenix’in kullanılan eğitim/retrieval indekslerinden birinin zaman damgası ve üyelik ölçütüdür.
- Reply veya repost almak tek başına yeterli değildir. OON reply ve OON repost adayları pre-filter aşamasında düşebilir.
- Orijinal, kendi başına anlaşılır, kaynaklı, zamanında ve belirli bir konuda uzmanlaşmış post en sağlam büyüme birimidir.
- Haber hesabı için görünür olmak, yalnızca yüksek ham etkileşim değil, öneri yüzeylerinde güvenli ve sınıflandırılabilir bir aday olarak kalabilmektir.
- X’in açık kaynak kodu “şu kadar dakikada şu kadar etkileşim al” gibi resmi bir büyüme garantisi vermemektedir.

## 1. kaynak ve kapsam

### 1.1 ana kaynaklar

- [x-algorithm README](https://github.com/xai-org/x-algorithm/blob/d0cef2f943084ee0d4310378031c9c2c37d67f12/README.md)
- [Phoenix README](https://github.com/xai-org/x-algorithm/blob/d0cef2f943084ee0d4310378031c9c2c37d67f12/phoenix/README.md)
- [candidate pipeline kodu](https://github.com/xai-org/x-algorithm/tree/d0cef2f943084ee0d4310378031c9c2c37d67f12/home-mixer/server/src/main/scala/com/twitter/home_mixer/product/scored_tweets/candidate_pipeline)
- [Phoenix retriever](https://github.com/xai-org/x-algorithm/tree/d0cef2f943084ee0d4310378031c9c2c37d67f12/phoenix)
- [ranking modelleri](https://github.com/xai-org/x-algorithm/tree/d0cef2f943084ee0d4310378031c9c2c37d67f12/ranking)
- [ranking varsayılan parametreleri](https://github.com/xai-org/x-algorithm/blob/d0cef2f943084ee0d4310378031c9c2c37d67f12/ranking/src/main/rust/model/param.rs)
- [visibility filters](https://github.com/xai-org/x-algorithm/tree/d0cef2f943084ee0d4310378031c9c2c37d67f12/visibility-filters)
- [Grok multimodal renderer](https://github.com/xai-org/x-algorithm/tree/d0cef2f943084ee0d4310378031c9c2c37d67f12/grok)

Bu bağlantılar sabit commit’e sabitlenmiştir. Böylece ileride <code>main</code> dalı değişse bile bu belgenin dayandığı kaynak değişmez.

### 1.2 repo kapsamı

İncelenen commit yaklaşık iki binin üzerinde dosyadan oluşan, 2025 civarındaki X öneri hattının önemli parçalarını açıklar. Ancak depo şunları tam olarak göstermez:

- üretimdeki bütün model ağırlıkları ve checkpoint’ler
- canlı feature flag ve deney kovaları
- kullanıcıya özel gerçek zamanlı skorlar
- tüm depolama, veri akışı ve servis topolojisi
- bütün Botmaker kuralları ve eşikleri
- Grok’un bazı üretim prompt’ları
- yüzey bazlı bütün dağıtım farkları
- öneri dışındaki tüm X ürün algoritmaları

Bu nedenle “algoritmayı tamamen ele geçirdik” ifadesi doğru değildir. Doğru ifade, “açık kaynak kodun gösterdiği aday üretimi, filtreleme, ranking ve çeşitlilik sözleşmesini çıkardık”tır.

## 2. genel mimari

### 2.1 iki ayrı ana aşama

README’nin ana ayrımı:

- Candidate pipeline: aday post’ları toplar ve temizler.
- Blending pipeline: farklı aday akışlarını tek bir ana sayfa akışına birleştirir.

“Following” akışı çoğunlukla ters kronolojik bir akıştır. “For You” ise aday kaynakları, ranking, görünürlük ve blender modülleriyle daha karmaşıktır.

~~~text
kullanıcı isteği
    |
    v
query hydrators
    |
    +--> Thunder: in-network
    +--> Phoenix: out-of-network semantik retrieval
    +--> SimClusters: ilgi topluluğu benzerliği
    +--> CachedPosts
    +--> diğer açık/kapalı kaynaklar
    |
    v
candidate hydrators
    |
    v
pre-filters
    |
    v
candidate scorers
    |
    v
candidate selectors / top-k
    |
    v
post-selection filters ve side effects
    |
    v
outer For You blender
    |
    +--> organik post'lar
    +--> reklam
    +--> WhoToFollow
    +--> prompt / survey / frame modülleri
    |
    v
kullanıcıya gösterim
~~~

### 2.2 candidate pipeline aşamaları

Kaynak kodun tanımladığı genel akış:

1. Query hydrator’lar
2. Candidate source’lar
3. Candidate hydrator’lar
4. Pre-filter’lar
5. Candidate scorer’lar
6. Selector / top-k
7. Post-selection hydrator ve filter’lar
8. Side effect’ler

Çalışma semantiği:

- Query hydrator’lar bağımsızsa paralel çalışabilir.
- Source’lar konfigürasyondaki sırada değerlendirilir, servis altyapısı izin verdiğinde paralel çağrılabilir.
- Candidate hydrator’lar genellikle aday bazında paraleldir.
- Filter sırası önemlidir. Erken düşen aday sonraki aşamalara girmez.
- Scorer sırası önemlidir. Bir scorer’ın ürettiği bilgi sonraki scorer’a gidebilir.
- Side effect’ler kullanıcı yanıtını bekletmeyecek şekilde asenkron olabilir.
- Bir source hata verdiğinde bütün istek mutlaka çökmez. Hata çoğu zaman o kaynağın adaylarını azaltır.
- Tek bir adayın hidratasyon hatası bütün pipeline’ı öldürmek zorunda değildir.

Bu yapı, “yüksek etkileşim alan her post kesin sıralanır” düşüncesini geçersiz kılar. Post önce doğru source’a girmeli, sonra bütün zorunlu filter’lardan geçmelidir.

## 3. Phoenix candidate pipeline

### 3.1 kaynak sırası ve kapasite

Phoenix konfigürasyonunda görülen ana kaynaklar:

| kaynak | anlam | varsayılan durum | yaklaşık kapasite |
|---|---|---:|---:|
| Thunder | takip edilen hesaplardan in-network post’lar | açık | 1200 |
| TweetMixer | eski/alternatif mixer yolu | kapalı | kaynak kodunda tanımlı |
| SimClusters | ilgi topluluklarından OON adaylar | açık | 800 |
| Phoenix | semantik OON retrieval | açık | 1000 |
| PhoenixTopics | konu tabanlı Phoenix varyantı | tanımlı | deploy’a bağlı |
| PhoenixMOE | mixture-of-experts varyantı | kapalı | deploy’a bağlı |
| CachedPosts | önbellek adayları | açık | 750 |

Bu sayılar nihai kullanıcı akışının uzunluğu değildir. Bunlar aday havuzuna girmeden önceki veya kaynak başına talep edilen üst sınırlardır.

### 3.2 query hydrator’lar

Kodda görülen query-level bilgiler arasında şunlar vardır:

- scoring ve retrieval özellikleri
- blocked ID’ler
- muted ID’ler
- takip edilen ve abonelik ID’leri
- cached post ID’leri
- mutual follow bilgisi
- demografik sinyaller
- Grok topic bilgisi
- starter pack’ler
- uygulama bilgileri
- açık ve örtük kullanıcı sinyalleri
- seen bloom filter
- IP ve ağ ile ilgili bağlam
- çıkarılmış cinsiyet gibi model feature’ları

Bazı helper’lar oluşturulsa bile pipeline’a eklenmemiş olabilir. Örneğin bir <code>ImpressedPosts</code> hydrator’ının yaratıldığı fakat aktif sıraya koyulmadığı kod sürümleri görülebilir. Bu tür bir gözlem, “feature kesin üretimde kullanılıyor” anlamına gelmez.

### 3.3 candidate hydrator’lar

Aday post’lar için görülen zenginleştirmeler:

- in-network durumu
- iki yönlü takip durumu
- temel tweet/core data
- quote ilişkisi
- medya bilgisi
- subscription durumu
- yazar Gizmoduck bilgisi
- viewer tarafından bloklanma
- filtrelenmiş konu bilgisi
- dil kodu
- etkileşim sayaçları
- semantic ID

Bu aşamada post metni, yazar, medya, quote zinciri ve sosyal grafik bilgisi aynı aday nesnesinde birleştirilir.

### 3.4 pre-filter sırası

Kaynak kodda görülen filtre aileleri yaklaşık olarak şu sıradadır:

1. duplicate post
2. core data eksikliği
3. maksimum yaş
4. viewer’ın kendi post’u
5. OON reply/repost kısıtı
6. OON NSFW SimClusters kısıtı
7. retweet deduplication
8. subscription gereksinimi
9. seen post
10. seen backup filter
11. served post
12. muted keyword
13. author social graph
14. Brezilya 2026 seçimleriyle ilgili özel filtre
15. video filtresi
16. konu ID’leri
17. yeni kullanıcı minimum engagement filtresi
18. inventory holdout

İki önemli varsayılan:

- New-user minimum-engagement kuralı varsayılan olarak aktif değildir.
- Inventory holdout varsayılan olarak aktif değildir.

Bu sıra, bir post’un “neden görünmediği” sorusunda önemlidir. Örneğin post daha sonra ranking’de düşük çıkmadı, yaş filtresinde veya OON reply filtresinde daha önce elenmiş olabilir.

### 3.5 SimClusters kaynak ayrıntıları

SimClusters, kullanıcı sinyallerini ilgi topluluklarına ve benzer post embedding’lerine bağlayan ayrı bir aday kaynağıdır. Kodda görülen sınırlar yaklaşık olarak şöyledir:

- sinyal türü başına en fazla 15 sinyal
- her seed için en fazla 200 aday
- iç aday havuzu için yaklaşık 10.000 toplam aday sınırı
- post benzerliği için yaklaşık 0.5 üzeri eşik
- aday yaşı için yaklaşık 48 saat
- candidate pipeline çıktısı için 800 aday sınırı

Açık sinyal türleri arasında şunlar bulunur:

- Favorite
- reply
- retweet
- bookmark
- share

Örtük sinyaller arasında photo view ve video view bulunabilir. Video view için yaklaşık 10 saniyelik izleme eşiği görülebilir. Embedding üretiminde Favorite sinyallerinin log-benzeri ağırlıkları kullanılır.

Bu kaynak Phoenix retrieval ile aynı şey değildir. SimClusters bir ilgi topluluğu benzerliği yolu, Phoenix ise semantik iki-kuleli retrieval yoludur. İki kaynak aynı kullanıcı için farklı adaylar üretebilir.

## 4. post creation ve Favorite indeksleri

### 4.1 Phoenix’in kullandığı eğitim/retrieval indeksleri

Phoenix README ve veri işleme kodu, HOME retrieval için şu tür bir dizin adını gösterir:

<code>post_sid_v5_256x6_snapshots/1fav_1day.parquet</code>

Aynı rankall akışında aşağıdaki zaman veya etkileşim indeksleri de yazılır:

- post_creation
- 1fav
- 1fav_1day

Bunun anlamı:

- “İlk Favorite” post’un ilk kez Favorite almasıyla ilgili yapısal bir veri olayıdır.
- “1fav_1day” post’un ilk Favorite olayından sonraki bir günlük pencereyi temsil eden bir veri kümesi olarak kullanılır.
- Bu, “ilk Favorite’i alan her post algoritmik olarak favori olur” anlamına gelmez.
- İlk Favorite almayan post’lar belirli retrieval veri setlerinde yer alamayabilir. Ancak bu yine de kullanıcı arayüzünde görünürlük veya viral olma garantisi değildir.
- İlk Favorite sinyaliyle ilişkili bir veri kümesinde bulunmak, doğrudan final sıralama skoru değildir.

Rankall akışındaki bir yorum ayrıca doğrudan, koordineli navigation engagement’ların ranking sinyali olarak sayılmaması gerektiği yönündedir. Bu nedenle yapay biçimde aynı hesaplar arasında profile açma, post açma ve gezinti üretmek kaynak kodda güvenli bir büyüme yöntemi olarak desteklenmez.

Rankall’in normal akışında community post’ları, reply’ler, repost’lar ve bazı VF/adult içerik sınıfları ayrı tutulur veya düşürülür. Bu, veri hazırlama akışındaki bir kapsama tercihidir; canlı ürünün bütün yüzeylerinde bu içeriklerin hiçbir zaman görünmeyeceği anlamına gelmez.

### 4.2 yaş penceresi

Phoenix Candidate Pipeline’da maksimum post yaşı varsayılan olarak yaklaşık 48 saattir.

Bu, haber hesabı için güçlü bir sonuç doğurur:

- İlk saatler ve ilk gün kritik olabilir.
- Eski bir post yeni etkileşim alsa bile 48 saatlik aday yaş sınırına takılabilir.
- Following akışındaki kronolojik görünürlük ile For You retrieval yaş penceresi aynı şey değildir.
- Arşiv, arama, profil ve takipçi akışı gibi yüzeyler farklı davranabilir.

## 5. Phoenix retrieval ve temsil

### 5.1 iki kuleli yapı

Phoenix retrieval iki ana vektör üretir:

1. Kullanıcı kulesi
   - kullanıcı geçmişi
   - kullanıcı profili
   - takip ve sosyal grafik özellikleri
   - geçmişteki action ve dwell davranışları

2. Aday kulesi
   - post semantic ID
   - yazar kimliği
   - multimodal içerik embedding’inden türetilmiş residual-quantized temsil

Aday semantic ID yaklaşık 6 adet 256 boyutlu residual-quantized koddan oluşan bir temsil olarak açıklanır. Aday indeksinde semantic ID ile hash’lenmiş author ID birlikte kullanılabilir.

Önemli ayrım:

- Üretim retrieval yolunda doğrudan kullanıcı ID embedding’i kullanılmaz.
- Model checkpoint’i aday indeksini içerir.
- Kullanıcı ve aday vektörleri dot-product benzerliğiyle karşılaştırılır.
- Retrieval, final ranking değildir. Sadece iyi adayları daha sonra ayrıntılı sıralamaya taşır.

Phoenix README’si gerçek model, eğitim akışı ve Rust serving motoru hakkında üretim odaklı bir açıklama sunar. Bununla birlikte canlı altyapının tamamı, checkpoint seçimi, deploy parametreleri ve deney kovaları açık kaynak deposunda yoktur. README’de ve Grok/Botmaker çevresinde açıklanmayan üretim parçaları olduğu için yerel kodun varsayılanları canlı davranışın tamamı olarak okunmamalıdır.

### 5.1.1 Premium, doğrulama ve dağıtım sınırı (2026-08 doğrulaması)

Premium bilgisinin algoritmaya hiç girmediğini söylemek doğru değildir. Güncel açık kaynak akışında aday hydration; author details, account labels ve subscription status taşır. Phoenix proto’da `BASIC`, `PREMIUM` ve `PREMIUM_PLUS` tier’ları ile `isBlueVerified` alanı tanımlıdır. UserCred V2, blue/gray/gold/Verified Organization/affiliate hesapları `isPremium` kabul eder ve uniform teleport prior’ını yalnız bu premium-eligible hesaplardan üretir; varsayılan engagement teleport beta değeri `0.5`, PageRank jump probability değeri `0.2`dir.

Bu bulguların sınırı nettir:

- Açık `RankingScorer`, predicted action probability değerlerini ağırlıklandırır; herkes için `Premium × sabit katsayı` formülü göstermez.
- Bu nedenle Premium tier, global ve sabit bir post reach çarpanı olarak Ispatla skoruna eklenmez.
- X’in resmi yardım merkezi Basic/Premium/Premium+ için kademeli reply prioritization tanımlar; conversation ranking sayfası da Premium subscriber olmayı reply sıralama faktörlerinden biri sayar. Ispatla post-only yayınladığı için bu avantaj normal post skoruna çevrilmez.
- Buffer’ın 18,8 milyon post / 71 bin hesap analizi Premium hesaplarda yaklaşık 10× medyan reach korelasyonu bildirir; bu randomized experiment değildir ve uygulama katsayısı değildir.

Ispatla sözleşmesi: public rozet tipi (`blue`, `organization`, `government`, `not_verified`) ile manuel, yalnız yayıncı hesabına ait subscription tier geçmişi ayrı tutulur. Tier yalnız aynı hesabın yeterli pre/post public snapshot verisi olduğunda, otomatik hesap seçiminde küçük ve denetlenebilir bir tie-break olarak kullanılabilir.

### 5.2 adaylar birbirine bakamaz

Phoenix ranking modelinde aday post’ların birbirlerine dikkat etmesi kapalıdır. Her aday kullanıcı bağlamına karşı ayrı değerlendirilir.

Bu şu anlama gelir:

- Aday listesinde iki benzer post bulunması ilk model skorunda birbirini doğrudan değiştirmeyebilir.
- Benzerlik ve çeşitlilik daha sonraki author diversity veya VMRanker/DPP katmanlarında ele alınabilir.
- “İlk sıradaki post ötekilere göre skorunu değiştirdi” gibi bir varsayım doğrudan desteklenmez.

### 5.3 multimodal ve Grok V8.2 renderer

Grok renderer’ın post temsilinde kullanabildiği alanlar arasında şunlar bulunur:

- post metni
- author adı ve bio
- verified ve subscription durumu
- follower/following sayıları
- hesabın yaşı
- ülke ve dil
- görseller
- video kareleri
- ASR transcript
- article title
- card title ve domain
- quoted post içeriği

Bu, metnin önemsiz olduğu anlamına gelmez. Daha doğru okuma şöyledir:

- Ham metin, final <code>TweetInfo</code> içinde tek başına bir ağırlık alanı değildir.
- Metin semantic ID ve multimodal temsil yoluyla retrieval ve ranking feature’larına dolaylı şekilde girebilir.
- Başlık, kart, URL domain’i ve medya, modelin postun konusunu ve bağlamını anlamasına katkı verebilir.
- İnsan için anlaşılır olmak ile modele semantik olarak sınıflandırılabilir olmak aynı ama birbirinden ayrı hedeflerdir.

### 5.4 ranking feature’ları

Kaynak ve README’de görülen feature aileleri:

- hashed post, author ve semantic ID’ler
- dil
- ülke ve konum
- cinsiyet ve yaş gibi model feature’ları
- uygulama bilgisi
- product surface
- post yaşı
- timezone ve saat
- engagement counts
- mutual-follow yönleri
- geçmiş action’lar
- dwell ve aktif kalma süreleri
- kullanıcı geçmişi ve ilgi sinyalleri

Engagement count’lar modelde ham son skor olarak kullanılmaz. Feature hazırlığında log-benzeri normalize edilmiş dönüşümler vardır. Yaklaşık olarak <code>log2(count + 1) / 32</code> türü ölçekleme görülür. Bu, “10 kat Favorite alan post kesin 10 kat üstte çıkar” gibi doğrusal bir yorumun yanlış olduğunu gösterir.

## 6. aksiyon olasılıkları ve skor ağırlıkları

### 6.1 Phoenix action head’leri

Phoenix, bir post için birden fazla kullanıcı eyleminin olasılığını tahmin eder:

- favorite
- reply
- retweet
- photo expand
- video open
- click
- open link
- profile click
- view quality
- share
- direct message share
- copy link
- quote
- quoted click
- follow author
- post unexplored
- dwell time
- active seconds
- negative feedback
- not interested
- block
- mute
- report
- not dwelled

Kullanıcıya gösterilen final skor bu eylemlerin tek bir tanesi değildir. Ağırlıklı bir bileşimdir.

### 6.2 varsayılan ağırlıklar

<code>ranking/src/main/rust/model/param.rs</code> içindeki varsayılan ağırlık ailesi:

| eylem | ağırlık |
|---|---:|
| favorite | 0.5 |
| reply | 5 |
| retweet | 1 |
| quote | 5 |
| share | 2 |
| direct message share | 5 |
| copy link | 20 |
| click | 0.4 |
| open link | 0.2 |
| profile click | 0 |
| follow author | 4 |
| photo expand | 0.05 |
| video open | 0.05 |
| view quality | 0.05 |
| quoted click | 0.05 |
| quoted view quality | 0 |
| post unexplored | 0.02 |
| continuous dwell time | 0.004 |
| continuous click dwell | 0 |
| active seconds residual | 0 |
| not dwelled | -0.02 |
| not interested | -43.2 |
| block | -31.2 |
| mute | -58.8 |
| report | -234 |

Ek ayrıntılar:

- Mutual-follow durumunda original reply için yaklaşık +15 düzeyinde özel bir boost görülebilir.
- Dwell boost varsayılan olarak 0’dır.
- <code>post_unexplored</code> in-network-only özelliğine sahiptir ve varsayılan multiplicative değildir.
- Negative action’ların cezası çok büyüktür. Özellikle report, mute, block ve not interested sinyalleri küçük olumlu etkileşimleri kolayca bastırabilir.
- Alternatif dwell-regret modları vardır, fakat varsayılan ağırlıklı moddur.

Candidate scorer tarafında görülen seçim sınırları da önemlidir:

- scorer top-k değeri yaklaşık 50’dir.
- candidate pipeline’dan sonraki post seçimi yaklaşık 35 post düzeyindedir.
- outer For You blender’ının maksimumu yaklaşık 47 öğe olabilir.

Bu üç sayı aynı şeyi anlatmaz. İlki scorer’ın tuttuğu aday sırası, ikincisi organik post seçimi, üçüncüsü ise reklam ve başka feed modülleriyle karışmış dış akıştır.

### 6.3 haber hesabı için anlamı

Bu tablo “copy link her zaman Favorite’tan kırk kat önemlidir” şeklinde birebir yorumlanmamalıdır. Olasılıkların kalibrasyonu, model varyantı ve normalization devreye girer.

Yine de yönsel sonuçlar nettir:

- Sadece Favorite hedeflemek yetersizdir.
- Reply, quote, share, link click ve follow author gibi kaliteli eylemler önemlidir.
- Kopyalanan link, eylem başlıklarında yüksek değerli bir sinyaldir. Bu, her postta link doldurmak gerektiği anlamına gelmez. Link güvenilir, okunabilir ve postun iddiasını taşıyan bir kaynağa bağlanmalıdır.
- Negative feedback çok pahalıdır. Yanıltıcı başlık, aşırı bait, tekrar, spammy URL veya rahatsız edici görsel kısa vadeli etkileşim alsa bile uzun vadede öneri uygunluğunu bozabilir.
- Cevap zincirlerinde karşılıklı takip avantajı olabilir, fakat OON reply filtreleri nedeniyle bu avantaj tek başına geniş dağıtım sağlamaz.

## 7. soğuk başlangıç ve yazar çeşitliliği

### 7.1 author cold start

Kodda görülen varsayılanlar:

- impression threshold: 1000
- hedef slot aralığı: yaklaşık 15–16
- follower cap: 1000
- yaş sınırı: 86400 saniye
- düşük impression havuzunda maksimum konum oranı: 0.85
- enabled: true
- Thompson sampling: false

Kuralların pratik yorumu:

- Bu bütün yeni hesaplara global boost değildir.
- Aday çoğunlukla original post olmalıdır.
- Yazarın takipçi sayısı yaklaşık 1000 veya altında olmalıdır.
- Post veya yazarın gösterim geçmişi düşük olmalıdır.
- İlk yaklaşık yüzde 85’lik aday havuzunda en iyi eligible aday seçilebilir.
- Bir istek için en fazla bir cold-start adayı seçilir.
- Daha sonra author diversity, OON/reply/repost, visibility, DPP veya blender kuralları bu adayı yine düşürebilir.
- Hedef slot yaklaşık 15–16 çevresindedir. Bu, yeni hesabın ilk sıraya zorla çıkarılması değildir.
- 86400 saniyelik yaş sınırı yalnızca “yeni hesap” anlamına gelmez; treatment freshness ve impression bağlamıyla birlikte okunmalıdır.

### 7.2 author diversity formülü

Kodda görülen formül yaklaşık olarak şöyledir:

<code>(1 - floor) * decay^k + floor</code>

Varsayılanlar:

- decay = 0.5
- floor = 0.25
- k = aynı yazarın önceki görünme sayısı

İlk değerler:

| aynı yazarın sıra içindeki önceki görünme sayısı k | çarpan |
|---:|---:|
| 0 | 1.0000 |
| 1 | 0.6250 |
| 2 | 0.4375 |
| 3 | 0.34375 |
| 4 | 0.296875 |
| sonsuza doğru | 0.25 |

Bu formül bir yazarın ikinci ve üçüncü postunu otomatik olarak yasaklamaz. Ancak aynı yazardan gelen ardışık veya sık adayların score’unu aşağı çeker ve başka yazarların araya girmesine alan açar.

Haber hesabı için sonuç:

- Aynı olay hakkında arka arkaya beş benzer post atmak verimli değildir.
- Bir gelişmenin hızlı güncellemesi yapılacaksa her post yeni bilgi taşımalıdır.
- Konu aynı kalsa bile başlık, veri, kaynak veya yorum katmanı değişmelidir.

### 7.3 OON ve reply/repost faktörü

Ranking akışında görülen tipik sıra:

1. Phoenix scorer
2. Ranking scorer
3. author cold start
4. author diversity
5. OON/reply/repost discount
6. VMRanker veya son selector

OON factor yaklaşık 0.75 düzeyindedir. Topic factor yaklaşık 0.5 düzeyinde görülebilir. Yeni viewer için özel factor çok küçük olabilir, ancak ilgili eşik varsayılanı 0 olduğunda bu davranışın gerçek üretim koşulu deploy ayarına bağlıdır.

Kodda <code>NewUserAgeThresholdSecs</code> için varsayılanın 0 olması, yeni viewer’a özel düşük faktör yolunun her yerel varsayılanla otomatik olarak aktif olduğu anlamına gelmez. Bu davranış experiment veya deployment ayarına göre değişebilir.

En kritik davranış:

- OON reply ve OON repost’lar pre-filter’da düşebilir.
- OON original post ve bazı quote post’lar kalabilir.
- Başkasının postuna cevap vererek elde edilen etkileşim, hesabın kendi orijinal haber postunun discovery birimiyle aynı değildir.
- Quote zincirinde kaynak/ancestor post görünürlükten düşerse quote da ancillary filtrelerde elenebilir.

## 8. VMRanker ve DPP çeşitliliği

### 8.1 DPP ne yapar

VMRanker varsayılan olarak açık görünebilir ve model kimliği <code>dpp</code> olabilir. Konfigürasyonda theta yaklaşık 0.65, maksimum seçilen sıra yaklaşık 150 olarak geçer.

DPP benzeri seçim:

- Her adayın kalite skorunu dikkate alır.
- Birbirine çok benzeyen adayların birlikte seçilmesini pahalılaştırır.
- Konu veya yazar çeşitliliğini artırır.
- Final sıralama skorlarını hesapladıktan sonra seçilen adayların ilk kalite sırasını koruyabilir.
- Embedding eksikse random unit vector fallback görülebilir. Bu nedenle deployment veri kalitesi önemlidir.

### 8.2 CLI ve üretim farkı

Yerel DPP servisinde default kapalı bir CLI davranışı görülebilir. Candidate pipeline konfigürasyonunda açık görünen değer üretim dağıtımındaki gerçek flag’in aynısı olmayabilir.

Bu ayrım özellikle önemlidir: yerel servis komutunun <code>dpp=false</code> varsayılanı, Home Mixer tarafındaki VMRanker konfigürasyonunu kanıtlamaz. Aynı isimli model yolu farklı servis sınırlarında farklı varsayılanlarla çalışabilir.

Bu yüzden kesin söylenebilecek ifade:

- Kodda DPP/VMRanker için bir çeşitlilik yolu vardır.
- Üretimde hangi modelin ve hangi flag’in aktif olduğu açık kaynak deposundan tek başına garanti edilemez.

### 8.3 haber hesabı için sonuç

- Aynı olayın aynı cümleyle tekrarlanan versiyonları birbirleriyle rekabet eder.
- Bir postun ilk sıraya çıkması, hemen sonraki benzer postun da aynı performansı alacağı anlamına gelmez.
- “Hızlı güncelleme”, “kaynaklı bağlam”, “veri/harita”, “düzeltme” gibi farklı işlevler daha iyi ayrışır.
- Çeşitlilik yalnızca farklı hesapların içerikte görünmesi değildir. Aynı hesabın farklı bilgi türlerini üretmesi de adaylar arasında işlevsel ayrışma yaratabilir.

## 9. visibility filters

Ranking skoru yüksek olsa bile post görünürlükten düşebilir. Filtreler temel olarak iki geniş kategoriye ayrılır:

- Base home visibility
- Recommendations-only visibility

### 9.1 temel home kuralları

Kaynak kodda görülen drop aileleri:

- suspended author
- deactivated author
- erased veya offboarded author
- protected account sınırları
- viewer’ın blokladığı yazar
- viewer’ın mute ettiği yazar
- muted retweet
- PDNA
- bounce
- spam
- emergency-only
- hateful, violent veya abusive civic/FOSNR etiketleri
- nullcast
- stale içerik
- legal veya local takedown
- yaş/login bağlamına göre sensitive içerik
- exclusive içerik kısıtları
- NSFW/gore interstitial ihtiyacı
- yazar veya post durumundan gelen diğer güvenlik etiketleri

### 9.2 recommendations-only ek kurallar

For You gibi öneri yüzeylerinde daha sıkı düşürme kuralları olabilir:

- DMCA veya geo-restricted medya
- NSFW kullanıcı veya tweet etiketi
- do_not_amplify
- malicious URL
- spam high recall
- NSFW text
- abuse veya insult
- compromised account
- read-only account
- impersonation
- abusive high recall
- NSFW avatar/banner
- düşük kalite veya kötü URL sinyalleri
- güvenlik nedeniyle önerilmeyecek başka etiketler

İlk drop kuralı çoğu zaman sonucu belirler. Bazı OON-only kuralları takipçiye görünürlüğü koruyabilir, bazıları ise bütün yüzeylerde düşürür.

### 9.3 self-view istisnası

Kullanıcının kendi postunu görmesi, öneri için geçerli olan bütün visibility kurallarıyla aynı olmayabilir. Self-view veya profil görünümü bazı kontrollerden muaf olabilir.

Bu nedenle:

- “Postu kendi profilimde görüyorum” öneri sistemine girdiğini kanıtlamaz.
- “Takipçim görüyor” ile “OON bir kullanıcı For You’da gördü” farklı kanıtlardır.
- Test yapılacaksa farklı hesap ve farklı yüzeylerle bakılmalıdır.

### 9.4 haber hesabı için güvenlik sonucu

- Başlıkta gerçek kaynağı ve bağlamı açık tutmak spam/abuse yanlış pozitif riskini azaltır.
- Görsel kullanımı olayla doğrudan ilişkili olmalıdır.
- Yanıltıcı thumbnail, çarpıtılmış alıntı, otomatik üretilmiş tekrar ve kötü URL, yüksek ham etkileşim alsa bile recommendation filter’larına takılabilir.
- Hassas olaylarda uyarı, içerik çerçevesi ve doğrudan kaynak bağlantısı önemlidir.
- Görünürlük kurallarını aşmak için hesap veya içerik manipülasyonu yapılmamalıdır.

## 10. Botmaker ve kalite kuralları

Açık kaynak tarafta görülen veya adı geçen kalite kuralı aileleri arasında:

- duplicate text
- düşük kaliteli veya kötü URL
- spam high recall
- unsafe URL
- NSFW/gore
- tekrar ve düşük bilgi yoğunluğu
- kötüye kullanım/insult
- compromised/impersonation
- amplify edilmemesi gereken içerik

Botmaker’ın bazı üretim eşikleri ve Grok prompt’larının bir kısmı yayınlanmamıştır. Bu nedenle kaynak kodda adı görülen bir kuralın eşik değeri, bütün üretim davranışını açıklamaz.

Haber hesabı için en güvenli operasyon:

- linkleri doğrudan ve itibarlı alan adlarından vermek
- aynı metni farklı postlarda tekrar etmemek
- otomatik copy-paste akışını sınırlamak
- başlık ile içerik arasında açık ilişki kurmak
- düzeltmeleri silip yeniden yazmak yerine şeffaf biçimde belirtmek
- koordineli engagement veya yapay navigation kullanmamak

## 11. dış For You blender

Candidate pipeline’ın ilk 35–50 organik postu, kullanıcıya gösterilen son feed değildir.

Outer For You katmanında kodda görülen kaynak/modüller:

- organic post candidates
- ads
- WhoToFollow
- prompts
- push_to_home veya benzeri modüller
- Jetfuel frame’leri
- FeedSurvey
- başka ürün modülleri

Görülen sayısal örnekler:

- inner candidate pipeline final post sayısı yaklaşık 35
- outer For You maksimumu yaklaşık 47
- yaklaşık 4 feed module
- yaklaşık 8 frame

Bu sayılar sürüme ve deploy’a bağlıdır. Organik postlar blender tarafından başka modüllerle karıştırılır, bazı adaylar final yerleşimde düşebilir.

Ayrıca side effect’ler:

- served ID’leri kaydeder
- impression/seen state’i günceller
- feedback ve ölçüm için bilgi taşır
- sonraki retrieval isteklerini etkileyebilecek önbellek/bloom durumlarını günceller

## 12. Following akışı

Following pipeline, For You’dan farklıdır:

- ters kronolojik veya NightOwl benzeri sıralama
- takip edilen hesapların post’ları
- Phoenix’in semantik OON ranking’i yok veya sınırlı
- ranking action ağırlıkları aynı şekilde uygulanmaz
- görünürlük, güvenlik ve mute/block kuralları yine geçerlidir

Bu nedenle bir haber hesabının takipçilerinin postu Following’de görmesi, postun For You’da yeni kullanıcılara önerildiğini kanıtlamaz.

## 13. haber hesabı için içerik modeli

### 13.1 hesap konumu

Hesabın tek cümlelik bir vaadi olmalı:

- hangi konu
- hangi bölge
- hangi hız
- hangi kaynak standardı
- hata ve düzeltme politikası

Örnek konumlandırma biçimleri:

- “İstanbul ulaşım ve belediye kararları. Resmi kaynak bağlantısı, saat damgası, düzeltme açıkça belirtilir.”
- “Kripto regülasyon gelişmeleri. Resmi kurum metni ve birincil belge önceliklidir.”
- “Türkiye teknoloji şirketleri. Finansal ve hukuki iddialarda belge bağlantısı kullanılır.”

### 13.2 orijinal post formatı

Önerilen temel şablon:

~~~text
[olay]
[en önemli bağlam veya sayı]
[kaynak + saat / belge bağlantısı]
[gerekirse neyin henüz doğrulanmadığı]
~~~

Örnek:

~~~text
Ulaştırma Bakanlığı, X hattındaki gece seferi planını duyurdu.

Plan 1 Eylül itibarıyla 00.30 ve 02.00 ek seferlerini öngörüyor.
Detaylar resmi duyuruda: https://ornek.gov.tr/duyuru

Belediyenin uygulama takvimi ayrıca bekleniyor.
~~~

Şablonun amacı algoritmayı kandırmak değil:

- postu kendi başına anlaşılır yapmak
- konuyu sınıflandırılabilir kılmak
- güvenilir click/share/follow davranışı üretmek
- yanlış anlaşılma ve negative feedback’i azaltmak

### 13.3 format karşılaştırması

| format | güçlü taraf | ana risk | kullanım |
|---|---|---|---|
| kısa hızlı update | zamanlama, takip edilebilirlik | bağlamsızlık | doğrulanmış ilk gelişme |
| kaynaklı özet | güven ve link click | gecikme veya uzunluk | resmi belge, karar, veri |
| mini thread | bağlam ve açıklama | ilk post zayıf kalabilir | karmaşık olay |
| quote post | olayla ilişki kurma | OON quote/ancestor filtreleri | kaynak görünürse |
| reply | konuşmaya katılma | OON reply discovery kısıtı | ek bağlam, düzeltme |
| grafik/harita | karmaşık veriyi sıkıştırma | düşük kalite veya yanlış grafik | veri temelli içerik |
| video | yüksek dikkat ve bağlam | medya güvenliği ve üretim maliyeti | sahadan doğrulanabilir görüntü |

### 13.4 link ve medya

- Link, postun ana iddiasını destekleyen birincil veya güvenilir ikincil kaynağa gitmeli.
- URL domain’inin güvenilirliği önemlidir.
- Aynı domain’e sürekli ve benzer metinle link vermek spam görünümünü artırabilir.
- Medya ancak bilgi değerini artırıyorsa kullanılmalı.
- Başkasının fotoğrafını bağlamsız veya yanlış açıklamayla kullanmak negative feedback ve visibility riskini yükseltir.
- Hassas görüntülerde açıklama ve uyarı kullanmak gerekir.

## 14. ilk 14 gün için operasyon planı

Aşağıdaki takvim resmi X kuralı değildir. Kaynak koddan çıkan retrieval, cold-start, diversity ve visibility sınırlarına göre düşük riskli operasyon hipotezidir.

### gün 1–2: kimlik ve kalite

- dar konu ve bölge belirle
- net bio yaz
- avatar, banner ve isimle konu uyumu kur
- kaynak ve düzeltme politikasını profile koy
- üç adet kendi orijinal, kaynaklı post yayınla
- aynı cümleyi tekrar etme
- önemli hesapları konu için takip et, engagement pod kurma

### gün 3–5: ritim

- günde iki veya üç orijinal post
- biri hızlı update
- biri bağlam veya veri
- gerekirse bir düzeltme veya gelişme postu
- aralarda ilgili hesaplara anlamlı cevap ver
- reply’ları kendi ana büyüme birimin sanma

### gün 6–7: format testi

- kısa update ile kaynaklı özetin performansını karşılaştır
- linkli ve linksiz postları konu bağlamında karşılaştır
- görselin gerçekten ek değer sağlayıp sağlamadığını ölç
- aynı olayın tekrarını azalt

### gün 8–10: uzmanlık

- iyi performans alan alt başlığı daralt
- birincil kaynakları düzenli takip et
- bir mini thread veya kısa veri özeti yayınla
- takipçiye yeni bilgi veren quote veya reply kullan

### gün 11–14: seçme ve iyileştirme

- düşük kaliteli formatları azalt
- en iyi performans alan konu + format çiftini koru
- ilk saat ve 24 saat metriklerini ayır
- negative feedback, unfollow ve spam sinyali varsa başlık dilini yumuşat
- en iyi postları kopyalamak yerine aynı bilgi standardını yeni olaylara uygula

Operasyonel başlangıç ritmi:

- günde 3 ana orijinal post
- postlar arasında yaklaşık 2–4 saat
- önemli breaking news olduğunda ek update
- her post yeni bir bilgi veya bağlam katmalı

Bu ritim algoritmanın resmi bir sabiti değildir. Yazar çeşitliliği, 48 saatlik yaş penceresi, cold-start slotu ve haberin hızlı eskimesi birlikte düşünülerek seçilmiş pratik bir başlangıçtır.

## 15. ölçüm planı

### 15.1 temel metrikler

Her orijinal post için mümkün olduğunca ayrı kaydet:

- ilk Favorite’a kadar geçen süre
- ilk 60 dakikadaki impression
- ilk 24 saatteki impression
- reply / impression
- quote / impression
- share / impression
- link click / impression
- profile click / impression
- follow author / impression
- 24 saat sonra gelen follow sayısı
- negative feedback belirtileri
- postun Following’de ve For You’da görüldüğüne dair ayrı gözlemler

### 15.2 yorumlama

| gözlem | olası yorum |
|---|---|
| yüksek impression, düşük link click | başlık merak yaratıyor ama kaynak veya vaat net değil |
| düşük impression, yüksek reply oranı | konu dar olabilir veya dağıtım sınırlı olabilir |
| yüksek Favorite, düşük follow | tekil olay ilgi çekiyor, hesap vaadi net değil |
| yüksek click, yüksek not interested | başlık ile hedef sayfa arasında uyumsuzluk olabilir |
| quote iyi, reply düşük | tartışmalı veya yorumlanabilir içerik |
| ilk saat iyi, 24 saat zayıf | yaş penceresi veya haberin hızlı eskimesi |
| Following iyi, For You zayıf | sosyal grafik görünürlüğü var, OON öneri adaylığı yok olabilir |
| kendi profilde görünür, yeni hesapta görünmez | self-view istisnası veya visibility farkı |

### 15.3 tek metriğe bağlanmama

İlk Favorite veya ilk reply tek başına başarı değildir. Daha anlamlı bir ölçüm seti:

- öneri yüzeyinde impression
- kaliteli eylem
- profile click
- follow conversion
- source link click
- negative feedback yokluğu
- aynı hesabın sonraki postlarının discovery kapasitesi

## 16. sık sorulara doğrudan yanıtlar

### “İlk Favorite algoritmaya giriş bileti mi?”

Bazı Phoenix veri setlerinde <code>1fav_1day</code> ilk Favorite olayına göre oluşturulur. Bu, belirli retrieval/eğitim indekslerine girme koşulu olabilir. Ancak bu event final sıralama puanı değildir ve garanti edilmiş yayılım sağlamaz.

### “İlk Favorite’i çok hızlı almak gerekir mi?”

Haber postu için ilk saat önemlidir, çünkü içerik yaşlanır ve 48 saatlik aday penceresine girer. Fakat kaynak kodu “X dakika içinde Favorite alırsan kesin boost” şeklinde bir kural göstermemektedir.

### “Reply kasmak yeterli mi?”

Hayır. OON reply ve OON repost’lar filtrelenebilir. Reply, ilgili konuşmaya katkı olarak faydalıdır; hesabın kendi orijinal postu discovery için daha güvenilir temel birimdir.

### “Link vermek reach’i düşürür mü?”

Kaynak kodu bütün harici linkleri otomatik düşüren tek bir kural göstermiyor. Link; click, open_link ve copy_link eylemleriyle modellenebilir. Sorun güvenilmeyen, kötü, unsafe veya spammy URL olabilir. Güvenilir ve bağlama uygun link kullanmak daha sağlamdır.

### “Yeni hesaplar otomatik boost alıyor mu?”

Author cold start için koşullu bir yol vardır. Bu, bütün yeni hesapların ilk sıraya çıkması değildir. Düşük gösterim, düşük takipçi, original post, yaş ve aday havuzu koşulları birlikte gerekir.

### “Günde kaç post atmalıyım?”

Bu kaynak kodunda tanımlı bir sabit değildir. Başlangıç için 2–3 özgün post ve 2–4 saatlik aralık, haberin yaşlanma penceresi ve yazar çeşitliliğiyle uyumlu bir operasyon hipotezidir. Breaking news farklı ele alınabilir.

### “Aynı konuyu arka arkaya yazayım mı?”

Yeni bilgi taşımayan tekrarlar author diversity ve benzerlik katmanlarında birbirleriyle rekabet eder. Güncelleme, bağlam, veri ve düzeltme gibi ayrı bilgi türleri üretmek daha iyidir.

### “Spam ve görünürlük filtrelerini nasıl aşarım?”

Aşmaya çalışmak yerine içeriği kaynaklı, özgün, anlaşılır ve güvenli tutmak gerekir. Botmaker, recommendation-only ve safety filtrelerinin üstesinden gelmeye yönelik manipülasyon önerilmez.

## 17. kaynak kodu dosya haritası

Aşağıdaki harita inceleme sırasında en önemli görülen alanları toplar. Dosya adları sabit commit’e göre okunmalıdır.

### candidate pipeline

- <code>home-mixer/server/src/main/scala/com/twitter/home_mixer/product/scored_tweets/candidate_pipeline/PhoenixCandidatePipelineConfig.scala</code>
- <code>home-mixer/server/src/main/scala/com/twitter/home_mixer/product/scored_tweets/candidate_pipeline</code>
- <code>home-mixer/server/src/main/scala/com/twitter/home_mixer/product/scored_tweets/candidate_pipeline/filter</code>
- <code>home-mixer/server/src/main/scala/com/twitter/home_mixer/product/scored_tweets/candidate_pipeline/scorer</code>

### Phoenix

- <code>phoenix/README.md</code>
- <code>phoenix/src</code>
- <code>phoenix/src/main/rust</code>
- <code>phoenix/src/main/rust/rankall</code>
- <code>phoenix/src/main/rust/retrieval</code>
- <code>phoenix/src/main/rust/model</code>

### ranking

- <code>ranking/src/main/rust/model/param.rs</code>
- <code>ranking/src/main/rust/model</code>
- <code>ranking/src/main/rust/serve</code>
- <code>ranking/src/main/rust/dpp</code>
- <code>ranking/README.md</code>

### Grok

- <code>grok</code>
- <code>grok/src</code>
- Grok V8.2 renderer ve multimodal post temsil kodları

### visibility

- <code>visibility-filters/src/main/scala</code>
- base home filter’ları
- recommendations-only filter’ları
- post, author, media, URL ve safety etiket kontrolleri

### blender

- <code>home-mixer/server/src/main/scala/com/twitter/home_mixer/product/scored_tweets/blender</code>
- outer For You kaynakları
- ads, WhoToFollow, prompt, survey ve frame modülleri
- organic/non-organic blending ve side effect yolları

## 18. kaynakta görülen ama üretimde bilinmeyen noktalar

Aşağıdaki maddeler bu açık kaynak incelemesiyle kesinleştirilemez:

- üretimdeki Phoenix checkpoint sürümü
- canlı kullanıcı ve aday indeksinin tam güncellik gecikmesi
- hangi source flag’lerinin hangi shard veya yüzeyde açık olduğu
- bütün experiment bucket’ları
- yeni kullanıcı davranışının deploy’a göre değişen özel eşikleri
- gerçek VMRanker/DPP dağıtım durumu
- kullanıcıya özel action probability değerleri
- Grok’un yayınlanmamış prompt ve guardrail’ları
- Botmaker’ın yayınlanmamış eşikleri
- For You dışındaki tüm yüzeylerin aynı kuralları kullanıp kullanmadığı
- gizli kalite ve anti-abuse sinyalleri
- reklam ve recommendation blender’ının canlı slot politikası

Bu belirsizlikler nedeniyle hesap büyümesi hakkında garanti, kesin zaman veya resmi “reach formülü” verilmemelidir.

## 19. pratik karar özeti

Yeni bir haber hesabı için en düşük riskli kararlar:

1. Dar ve anlaşılır bir beat seç.
2. Her orijinal postu kendi başına anlaşılır yaz.
3. Olay, bağlam, kaynak ve belirsizliği aynı postta belirt.
4. Birincil veya güvenilir doğrudan link kullan.
5. OON reply/repost’u ana büyüme planı yapma.
6. Aynı metni veya aynı görseli tekrarlama.
7. İlk 24 saati ölç, fakat tek bir Favorite’i başarı kriteri yapma.
8. Düşük negatif feedback’i, yüksek ham etkileşim kadar önemse.
9. İlk iki hafta 2–3 özgün post/gün ile ölçülebilir ritim kur.
10. Following görünürlüğü ile For You discovery’sini ayrı test et.
11. Yeni hesap cold-start yolunu otomatik garanti sanma.
12. DPP, author diversity ve görünürlük filtrelerinin benzer içerikleri azaltabileceğini kabul et.
13. Üretim flag’leri ve model checkpoint’leri açık olmadığı için sonuçları olasılıksal yorumla.
14. Koordineli engagement, yapay navigation veya güvenlik filtresi aşma denemelerine girme.

## 20. son hüküm

Açık kaynak X algoritması, haber hesabı için “en çok etkileşim alan kazanır” kadar basit değildir. Daha doğru model:

- Haber postu önce doğru aday kaynağına girmeli.
- Post 48 saatlik veya yüzeye özgü yaş sınırına takılmamalı.
- OON reply/repost gibi ilişkisel kısıtlardan etkilenmemeli.
- Base home ve recommendation visibility kurallarından geçmeli.
- Kullanıcı için anlamlı eylemler üretmeli.
- Negatif geri bildirim üretmemeli.
- Aynı yazar ve aynı konu tekrarlarında çeşitlilik cezasına takılmamalı.
- Outer For You blender’ın organik dışı modülleriyle rekabet etmeli.

Bu yüzden sağlam haber hesabı stratejisi algoritmayı kandırmaya değil, aday havuzunda kalacak ve farklı kullanıcılar için faydalı olabilecek özgün haber nesneleri üretmeye dayanır.
