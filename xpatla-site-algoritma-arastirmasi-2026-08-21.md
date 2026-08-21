# XPatla Site Mantığı ve Algoritma Araştırması

**Araştırma tarihi:** 21 Ağustos 2026  
**İncelenen ürün:** [xpatla.com](https://xpatla.com) / FAST AI LABS LTD  
**Araştırma sorusu:** XPatla’nın ürün mantığı, içerik üretim sistemi, geçmişteki X otomasyonu ve ticari büyüme döngüsü kamuya açık veriden nasıl açıklanabilir?  
**Yöntem:** Açık landing/pricing sayfaları, kullanım koşulları, gizlilik/KVKK bildirimi, şirketin kendi teknik beyanları ve X’in güncel resmî otomasyon kuralları incelendi. Giriş yapılmadı, API çağrıları denenmedi, korumalar aşılmadı ve kapalı kaynak tersine mühendislik yapılmadı.

> **En önemli güncel sonuç:** 10 Temmuz 2026’dan itibaren yeni kayıt ve satın alma; yeni X hesabı bağlama, X verisi çekme, X’e yayınlama ve zamanlanmış yayın kapalıdır. Mevcut kullanıcılar için yalnızca çevrim dışı taslak üretim yüzeyi kaldığı belirtilmektedir. Bu nedenle rapordaki “agent/market/DM” bölümleri, doğrulanmış güncel çalışma durumu değil, ürünün daha önce kamuya açıklanmış tasarımının analitik rekonstrüksiyonudur. [Kullanım koşulları](https://api.xpatla.com/legal/terms), [gizlilik bildirimi](https://api.xpatla.com/legal/privacy)

---

## Yönetici özeti

XPatla, X/Twitter öneri sistemini kontrol eden veya onun iç puanlarını bilen bir araç olarak görünmüyor. Daha doğru tanım: kullanıcının geçmiş açık X gönderilerinden bir **stil bağlamı** çıkaran, kaynak/niş gönderilerinden **içerik fırsatı** bulan, bir üretici modele kişiselleştirilmiş taslak yazdıran ve geçmiş ürün sürümünde bu taslağı kullanıcı hesabından yayınlama/yayın zamanlama katmanına iletebilen bir creator-growth ürünü.

Ürünün görünür değer teklifi üç mekanizmanın birleşimidir:

1. **Üretim maliyetini düşürmek:** tweet, thread, reply ve quote taslağı; uzunluk/formata göre kredi harcaması.
2. **Daha çok nitelikli deneme açmak:** izlenen hesaplar ve nişlerde dikkat çeken gönderileri bulup, bunlar için bağlama uygun reply/quote/thread önerisi üretmek.
3. **Dağıtım sürtünmesini azaltmak:** geçmişte otomatik yayın, otomatik quote/reply ve DM agent olarak pazarlanan yürütme katmanı.

Bu, “viral olacak içeriği matematiksel olarak kesin bulma” algoritmasından ziyade bir **aday üretme → sıralama → kişiselleştirilmiş üretim → insan veya otomasyonla yürütme** döngüsüdür. Şirketin kendi koşulları da erişim, gelir veya virallik garantisi vermediğini; çıktının kullanıcı tarafından doğrulanması gereken taslak olduğunu söyler. [Kullanım koşulları](https://api.xpatla.com/legal/terms)

---

## 1. Kanıt standardı ve sınırlar

| Seviye | Anlamı | Bu raporda örnek |
|---|---|---|
| **Doğrudan kanıt** | Güncel resmî sözleşme/gizlilik sayfasında açıkça yazıyor. | X entegrasyonunun 10 Temmuz 2026’da kapatılması; toplanan veri kategorileri; kredi maliyetleri. |
| **Ürün beyanı** | Şirketin marketing/pricing/kurumsal sayfasının söylediği; kaynak kodu veya bağımsız denetim değildir. | Stil klonlama, Market, XAgent, teknoloji yığını, kalite katmanları. |
| **Analitik çıkarım** | Yukarıdaki gözlemlerden türetilmiş olası iş akışı. | Aday puanı ile üretim prompt’unun birleşmesi. |
| **Bilinmiyor** | Kamuya açık malzemeyle doğrulanamayan kısım. | Puan fonksiyonunun ağırlıkları, model prompt’u, eşikler, öğrenme/geri-besleme kodu, gerçek yayın kuyruğu. |

Bu sınırlama önemli: X’in öneri/ranking modeli kapalıdır; XPatla’nın da kaynak kodu, oturum içi ekranları ve model çağrıları açık değildir. “Kesin algoritma” diye yazılabilecek bir şey yoktur. Aşağıdaki model, iddiaları ve gözlenebilir sözleşmeleri aşmadan açıklama yapan en sağlam modeldir.

---

## 2. Ürünün güncel durumu: tarihsel otomasyon ile bugün kalan yüzey ayrılmalı

| Özellik alanı | 10 Temmuz 2026 öncesi kamuya açıklanan tasarım | 21 Ağustos 2026 itibarıyla doğrulanabilen durum |
|---|---|---|
| Üyelik/satın alma | Plan, kredi ve abonelik | Yeni kayıt ve satın alma durdurulmuş. |
| X hesabı bağlama | OAuth ile bağlanma ve geçmiş gönderi analizi olarak pazarlanıyordu. | Yeni bağlantı yok. |
| X verisi | Açık profil/gönderi ile stil bağlamı ve muhtemel Market taraması | Yeni X verisi alma ve üçüncü taraf X çağrıları kapalı. |
| Yayınlama | XAgent, otomatik yayın ve zamanlama olarak pazarlanıyordu. | Yayınlama ve zamanlanmış X postu kapalı. |
| Taslak üretimi | Tweet/thread/reply/quote üretimi | Mevcut üyeler için çevrim dışı taslak özelliği kalmış görünüyor. |
| DM agent | DM yanıt otomasyonu olarak pazarlanıyordu. | Gizlilik metni yeni DM özelliği üzerinden özel mesajların AI için işlenmediğini söylüyor. |

Doğrudan sözleşme dili, ürünü şu an “AI-assisted content-drafting service” olarak çerçeveliyor. Bu, eski landing sayfasındaki tam otonom büyüme iddiasından daha dar bir tanımdır. [Kullanım koşulları](https://api.xpatla.com/legal/terms) · [Gizlilik bildirimi](https://api.xpatla.com/legal/privacy)

---

## 3. Sistem haritası: ürünün mantığı

```text
Geçmiş açık X gönderileri / kullanıcının verdiği kaynaklar
                 │
                 ▼
       Stil bağlamı (voice / tercih / örnekler)
                 │
                 ├──────────────┐
                 ▼              │
Niş/kaynak hesaplardan aday gönderiler  │
                 │              │
                 ▼              │
    Fırsat eleme ve sıralama     │
        (Market / Agent)         │
                 │              │
                 └──────┬───────┘
                        ▼
      Görev seçimi: tweet | quote | reply | thread | DM
                        ▼
  Üretici AI: içerik + stil + bağlam + format kısıtı
                        ▼
     kalite/stil kontrolü ve birden fazla taslak
                        ▼
          kullanıcı incelemesi / geçmişte otomatik yayın
                        ▼
     X üzerindeki gerçek dağıtım ve geri dönüş sinyali
```

Bu diyagramın ilk beş kutusu ürünün kendi değer üretimidir. Son kutu X’in kontrolündedir; XPatla’nın bunu yönetebildiğine dair teknik kanıt yoktur. Şirket, ürünün stil klonlama, içerik üretimi, koçluk, Market ve çoklu hesap bileşenlerini açıkça listeler; teknik sayfası “style fidelity checks”, “humanisation layers” ve çok aşamalı doğrulamadan söz eder. Bunlar **şirket beyanıdır**, bağımsız doğrulama değildir. [Fast AI Labs ürün/teknoloji sayfası](https://www.fastailabs.com/)

---

## 4. Adım adım algoritmik rekonstrüksiyon

### 4.1 Kimlik, hesap ve veri girişleri

Tarihsel tasarımda kullanıcı hesabı X OAuth ile bağlanıyor; halka açık profil/gönderiler ve bağlantı verisi alınabiliyordu. Gizlilik ve KVKK metni, ayrıca prompt’lar, kaynak metin, stil verisi, üretilen taslaklar, kullanım/kredi olayları, destek kayıtları ve teknik günlükleri sayıyor. Bugün yeni bağlantı ve yeni X verisi kapalıdır. [Gizlilik bildirimi](https://api.xpatla.com/legal/privacy) · [KVKK bildirimi](https://api.xpatla.com/legal/kvkk)

**Kesin olmayan ama makul çıkarım:** “stil klonlama”nın çalışması için sistemin kullanıcı gönderilerinden en azından dil, ton, cümle uzunluğu, biçim, konu, tekrar eden ifade ve örnek gönderi bağlamı türetmesi gerekir. Ancak hangi özelliklerin çıkarıldığı, kaç gönderi kullanıldığı, embedding mi yoksa fine-tuning mi yapıldığı açıklanmamıştır. Bu yüzden buna *model eğitimi* demek doğru olmaz; kamuya açık kanıt sadece saklanan/iletilen **stil bağlamını** destekler.

### 4.2 Stil profili: modelin "senin gibi" yazmasını sağlayan katman

Gizlilik politikası, önceden işlenen açık X postlarının ve kullanıcının sağladığı kaynakların saklanan stil bağlamında kullanılabildiğini; prompt, kaynak metin ve gerekli hesap bağlamının seçili AI sağlayıcısına gönderilebildiğini söyler. Bu, en olası uygulamanın çağrı anında bağlam ekleme (contextual prompting / retrieval) olduğunu gösterir; kesin mimari değildir. [Gizlilik bildirimi](https://api.xpatla.com/legal/privacy)

Basitleştirilmiş mantık şöyledir:

```text
style_context = özetle(kullanıcının geçmiş üslup örnekleri)
task_context  = kullanıcının talebi + seçilen format + kaynak/aday post
drafts        = AI_üret(style_context, task_context, güvenlik ve uzunluk kuralları)
```

Buradaki gerçek rekabet avantajı temel model değil, modelin önüne konan **hesaba özgü bağlam + doğru görev + doğru kaynak** bileşimidir. Aynı “viral tweet yaz” komutundan daha iyi hissettirmesinin mekanik sebebi bu olabilir.

### 4.3 Market / fırsat keşfi: neleri izleyip neden seçiyor?

Geçmiş ürün yüzeyi, nişte “patlayan” postları yakalama, niş bazlı viral tweet tarama, skor ve tahmini erişim göstergesi, bunlardan quote/reply/thread önerisi verme iddialarını taşıyordu. Pricing sayfası ayrıca XAgent Market ve hesap bağlama kapasitesi sunuyordu. [Fiyatlandırma](https://xpatla.com/pricing?highlight=lite)

Kamuya açık bilgi, skoru oluşturan formülü açıklamıyor. En savunulabilir aday-sıralama modeli şudur:

```text
adaylar = izlenen_hesaplar_veya_niş_kaynaklardan_yeni_postlar()
uygunlar = filtrele(adaylar,
    yaş, konu/niş uyumu, dil, içerik türü, güvenlik/politika riski)

fırsat_skoru = f(
    erken_etkileşim_hızı,
    yazar/ağ bağlamı,
    kullanıcının nişiyle uyum,
    yanıt/quote için tartışılabilirlik,
    güncellik,
    tekrar ve spam riski
)

seçilenler = sırala(uygunlar, fırsat_skoru)
```

Bu formül **XPatla’nın gerçek kodu değildir**; Market söyleminin zorunlu kıldığı bileşenleri gösteren analitik şemadır. Özellikle görüntülenme tahmini veya “viral skor” için modelin hangi X verilerine eriştiği, tahmin hatası, kalibrasyonu ve A/B testi bilinmiyor.

### 4.4 İçerik üretimi: format, kredi ve görev kısıtı

Kredi sistemi, üründeki asıl kaynak planlayıcıdır. Güncel koşullara göre Micro/Punch 15; Classic/Spark 20; Storm/Longform 25; Thunder/Mega 30; Quote/Reply 25; iki görselli Thread + GPT Image 100 kredi tüketir. Aylık kapasite Lite 750, Pro 1.500, Max 5.000 ve Ultra 12.000 kredidir; dönem sonunda devretmez. [Kullanım koşulları](https://api.xpatla.com/legal/terms)

Bu tasarımın algoritmik anlamı:

- Kullanıcı “tek bir metin” değil, maliyeti ölçülen bir üretim görevi seçer.
- Format, üretim uzunluğunu ve muhtemelen model/medya çağrısı sayısını sınırlar.
- Daha pahalı thread + görsel akışı, çoklu çıktı veya görüntü üretimi içerdiği için ayrı kotaya konur.
- Plan seviyesi, modelin zekâsını kanıtlı biçimde değiştirmekten çok çalıştırılabilecek üretim/otomasyon hacmini belirler.

Eski plan sayfaları “custom algorithm training” ifadesini Max/Ultra özellikleri arasında kullanıyordu; bunun kişisel stil bağlamı mı, ayrı bir sıralama profili mi, gerçek fine-tuning mi olduğu açıklanmamıştır. Bu yüzden bunu bağımsız bir model eğitimi özelliği olarak kabul etmek için kanıt yeterli değildir. [Fiyatlandırma](https://xpatla.com/pricing?highlight=lite)

### 4.5 Kalite katmanı: doğrulanmış iddia ile boşluk

Kurumsal teknoloji sayfası, çok aşamalı doğrulama, stil sadakati denetimi ve insanlaştırma katmanlarından söz eder. Bu, ham LLM çıktısının doğrudan sunulmadığı; en azından bir filtre/yeniden yazım/puanlama adımı olabileceği yönünde **ürün beyanıdır**. [Fast AI Labs](https://www.fastailabs.com/)

Kanıtlanmayanlar:

- Kaç taslak üretildiği ve hangisinin seçildiği,
- plagiarism/benzerlik denetimi olup olmadığı,
- haber/istatistik doğrulaması yapan bir retrieval sistemi,
- toksisite, marka güvenliği ve telif filtrelerinin somut eşiği,
- kullanıcı kabul/red kararlarının modele geri beslenip beslenmediği.

Ürünün koşulları bu boşluğu kullanıcıya yükler: haber, istatistik veya teknik bilgide doğrulama; telif, reklam açıklaması ve platform uyumu kullanıcı sorumluluğundadır. Virallik/erişim/gelir garantisi de yoktur. [Kullanım koşulları](https://api.xpatla.com/legal/terms)

### 4.6 Geçmiş yürütme katmanı: XAgent, yayınlama, reply ve DM

Tarihsel marketingte XAgent; içerik tarama, üretme ve yayınlama; quote/reply önerileri ve tam otomasyonla ilişkilendirildi. Fiyatlandırma sayfasındaki kullanıcı alıntıları da viral gönderilerin taranması, otomatik alıntı ve tweet atmayı anlatır. Bunlar kullanıcı beyanı/marketing malzemesidir; çalışma sıklığını veya güvenliğini ispatlamaz. [Fiyatlandırma](https://xpatla.com/pricing?highlight=lite)

Tarihsel yürütme akışı muhtemelen şuna benzerdi:

```text
periyodik tetikleyici
  → kaynakları tara
  → adayları puanla
  → görev türünü seç (orijinal post / quote / reply)
  → stile uygun taslak üret
  → otomatik yayın için kullanıcı ayarlarını kontrol et
  → X OAuth yetkisiyle yayınla veya inceleme kuyruğuna koy
  → olay/kredi kaydı yaz
```

Bu akışın “muhtemelen” seviyesinde kalmasının nedeni şudur: kuyruk sistemi, zamanlama, tekrar engelleme, hata geri alma, OAuth scope’ları ve gerçek yayın API’si açıklanmamıştır. Dahası, bu katman bugün kapalıdır.

---

## 5. X’in algoritması ile XPatla’nın algoritmasını ayırmak

| Soru | XPatla’nın yapabildiği anlaşılan şey | Yapamadığı / kanıtlanmayan şey |
|---|---|---|
| "X beni kime gösterir?" | İçerik fikri, biçim, zamanlama ve etkileşim fırsatı önerme. | X’in For You sıralama puanını okuma veya garanti etme. |
| "Hangi postu quote etmeliyim?" | Market benzeri aday bulma ve görünür skor/tahmin verme. | Gerçek erişimi kesin tahmin etme; formül açıklanmamış. |
| "Benim ağzımdan yazar mı?" | Geçmiş açık postlar ve sağlanan kaynaklardan stil bağlamı kullanma. | İnsandan ayırt edilemez veya olgusal olarak doğru sonuç garantisi. |
| "Otomatik büyütür mü?" | Tarihsel olarak otomatik üretim/yayın/DM iddiası. | Politikaya uygun, cezasız, kalıcı büyüme veya gelir garantisi. |
| "X algoritmasını çözdü mü?" | Dışarıdan gözlenen içerik/etkileşim örüntülerini ürüne dönüştürmüş olabilir. | X’in kapalı öneri modelini bildiğine dair kanıt yok. |

Bu ayrım ürün değerlendirmesinin merkezidir. XPatla’nın optimizasyon hedefi, platformun bilinmeyen sıralama fonksiyonunu doğrudan optimize etmek değil; içerik üretimi ve bağlama girme miktarını artırarak **daha çok ve daha uyumlu deneme** üretmektir. Sonuç, içerik kalitesi, takipçi-ağ uyumu, konu, zaman, rekabet, X’in güvenlik/spam sinyalleri ve şans gibi dış değişkenlere bağlı kalır.

---

## 6. Ticari ve büyüme mantığı: ürünün kendini büyüten döngüsü

XPatla’nın satış mantığı bir abonelik + kredi ekonomisidir. Kullanıcı üslup profili çıkarır, daha hızlı içerik üretir, daha fazla yayın/etkileşim denemesi yapar; olumlu sonuç görürse bunu X’te paylaşabilir ve bu paylaşımlar yeni kullanıcılar için sosyal kanıt oluşturur. Şirketin metrik ve testimonial’leri bu döngüyü pazarlama için kullanır; atfedilen sonuçlar bağımsız olarak doğrulanmış değildir. [Fast AI Labs](https://www.fastailabs.com/) · [Fiyatlandırma](https://xpatla.com/pricing?highlight=lite)

```text
Stil profili + içerik aracı
          ↓
daha az üretim sürtünmesi
          ↓
daha çok uygun içerik denemesi
          ↓
olası görünürlük/gelir sonucu
          ↓
kullanıcının public başarı paylaşımı
          ↓
organik edinim + abonelik + yeni kredi talebi
```

Bu büyüme döngüsü teknik öneri algoritması değildir; ürünün **go-to-market algoritmasıdır**. Araç çıktılarını paylaşmanın ürün tanıtımına dönüşmesi nedeniyle caziptir; ancak seçilim yanlılığı taşır: başarı hikâyeleri görünür olur, başarısız denemelerin oranı bilinmez.

---

## 7. Kamuya açıklanan altyapı ve veri akışı

Şirketin kendi beyanına göre ürün ailesi Next.js 16/App Router; Python FastAPI; Supabase + PostgreSQL; Google Gemini 2.5 Pro; Hetzner ve Cloudflare kullanır. Gizlilik metninde ayrıca Clerk, Stripe, OpenRouter/model sağlayıcıları, Google AI ve Resend listelenir. Bu bilgiler mimariyi anlamak için yararlıdır fakat erişilmiş deployment veya kaynak kodu kanıtı değildir. [Fast AI Labs teknoloji beyanı](https://www.fastailabs.com/) · [Gizlilik bildirimi](https://api.xpatla.com/legal/privacy)

```text
Tarayıcı
  ├─ Clerk: kimlik/oturum
  ├─ Next.js: ürün arayüzü
  └─ Cloudflare: ağ güvenliği ve yönlendirme

Uygulama katmanı
  ├─ FastAPI: asenkron inference/API olarak beyan edilmiş
  ├─ Supabase/PostgreSQL: hesap, kredi, stil/çıktı/meta veri
  ├─ AI sağlayıcıları: prompt + kaynak + gerekli stil bağlamı
  └─ Stripe/Resend: fatura ve iletişim

Geçmiş X katmanı
  └─ OAuth + açık X verisi + yayınlama (bugün devre dışı)
```

Gizlilik politikası, aktif ürün verisinin hesap silindikten sonra normalde 30 gün içinde silineceğini veya anonimleştirileceğini; ödeme, fraud, yedek ve hukuki kayıtların zorunlu süre kadar kalabileceğini söyler. [Gizlilik bildirimi](https://api.xpatla.com/legal/privacy)

---

## 8. X politikaları açısından kritik uyum boşluğu

Eski XAgent/DM Agent söylemi özellikle hassastır. X’in güncel resmî kuralları şunları ister:

- OAuth yetkisi tek başına kullanıcı adına otomatik eylem için yeterli onay değildir; eylem türü açıkça anlatılmalı, açık rıza alınmalı ve opt-out hemen uygulanmalıdır.
- Anahtar kelime aramasına dayanarak topluca otomatik reply göndermek yasaktır; otomatik reply/mention için alıcının önceden açık niyeti/opt-in’i gerekir.
- AI destekli otomatik reply botunun yayına alınması için X’ten önceden yazılı ve açık onay gerekir.
- Otomatik DM, istenmeden toplu biçimde gönderilemez; kullanıcı niyeti ve kolay opt-out gerekir.
- Toplu/benzer çoklu hesap postu, agresif repost, follow/unfollow ve otomatik beğeni gibi davranışlar riskli veya yasaktır.

[X otomasyon kuralları](https://help.x.com/en/rules-and-policies/x-automation) bu ihlallerde arama görünürlüğünün filtrelenebileceğini, hesap/uygulama askıya alınabileceğini belirtir. XPatla’nın kendi koşulları da spam, manipülatif içerik, istenmeyen toplu mesaj ve sahte etkileşim üretimini yasaklar. [XPatla kullanım koşulları](https://api.xpatla.com/legal/terms)

**Sonuç:** Geçmişte pazarlanan “otomatik reply + kaynak tarama + çoklu hesap” kombinasyonu, uygulama ayrıntılarına göre ciddi uyum riski doğurur. Kamuya açık belgeler XPatla’nın X’ten gerekli AI-reply onayını alıp almadığını, opt-in/opt-out’ı nasıl zorladığını veya benzerlik limitlerini nasıl uyguladığını göstermiyor. Bu, ihlal kanıtı değildir; doğrulanmamış, kritik bir kontrol boşluğudur.

---

## 9. Sonuç: XPatla’nın gerçek algoritmik tezi

XPatla’nın tezi şu cümleyle özetlenebilir:

> **X’in kime neyi göstereceğini bilmeye çalışmak yerine, her hesap için daha tutarlı sesle ve daha hızlı biçimde daha çok bağlama uygun içerik/etkileşim denemesi üret.**

Bu tezin teknik karşılığı, “stil bağlamı + fırsat keşfi + üretici AI + biçim/kredi yöneticisi + (tarihsel) yayın otomasyonu” birleşimidir. En değerli parça temel LLM’nin kendisi değil; kullanıcıya özgü örnekler, aday gönderinin bağlamı, görevin doğru seçilmesi ve üretim sürecinin tek panelde akmasıdır.

Fakat başarının sınırı da nettir:

- X’in öneri modeli kapalıdır ve XPatla erişim/virallik/gelir garantisi vermez.
- “Skor”, “tahmini erişim” ve “custom algorithm training”in hesaplama biçimi açıklanmamıştır.
- Şu an yeni X verisi ve yayın akışı kapalıdır; bu yüzden güncel ürünün tek güvenli tanımı kişiselleştirilmiş taslak üretimidir.
- Otomatik reply/DM/çoklu hesap büyütme, X’in resmî kurallarıyla yüksek uyum gerektirir; pazarlama iddiası uyum kanıtı değildir.

---

## Kaynaklar

1. [XPatla — güncel ana sayfa / hizmet durumu](https://xpatla.com) — 21 Ağustos 2026’da yeni kayıt ve satın alma durdurma duyurusu.
2. [XPatla Kullanım Koşulları](https://api.xpatla.com/legal/terms) — 10 Temmuz 2026 güncellemesi; mevcut hizmet sınırı, kredi sistemi, kullanıcı yükümlülükleri ve garantisizlik.
3. [XPatla Gizlilik Politikası](https://api.xpatla.com/legal/privacy) — veri kategorileri, sağlayıcılar, AI bağlamı, X entegrasyonunun kapatılması ve saklama.
4. [XPatla KVKK Aydınlatma Metni](https://api.xpatla.com/legal/kvkk) — işlenen kişisel veri ve aktarım kategorileri.
5. [XPatla Fiyatlandırma](https://xpatla.com/pricing?highlight=lite) — tarihsel plan/agent/Market/DM iddiaları ve kullanıcı testimonial’leri; marketing kaynağıdır.
6. [Fast AI Labs — XPatla ürün ve teknoloji beyanı](https://www.fastailabs.com/) — stil klonlama, ürün modülleri ve altyapı iddiaları; şirket beyanıdır.
7. [X — Automation rules](https://help.x.com/en/rules-and-policies/x-automation) — OAuth, otomatik post/reply/DM, AI reply botu, opt-in/opt-out ve yaptırım kuralları.
8. [X — The X Rules](https://help.x.com/en/rules-and-policies/x-rules) — platform manipülasyonu, spam ve özgünlük çerçevesi.

### Araştırma yeniden yapılacaksa

Gelecekte ürün yeniden X entegrasyonunu açarsa raporu güçlendirmek için yalnızca yetkili bir test hesabıyla şu kanıtlar toplanmalıdır: OAuth izin ekranı ve scope’lar; agent ayarları; yayın öncesi onay/opt-out kontrolleri; seçilen Market adayları ve skorları; üretilen alternatifler; kredi muhasebesi; tekrar/spam önleme; hata/geri alma davranışı ve gerçek X yayın kayıtları. Bunlar olmadan puan ağırlığı veya tam otomasyon davranışı hakkında kesin teknik hüküm verilmemelidir.
