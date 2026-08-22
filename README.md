# Ispatla

Ispatla, XPatla araştırmalarındaki `style context → Market → üretim → kalite →
otomasyon → feedback` mantığını bağımsız bir Next.js ürün paneline çevirir.
Vesper veya Hermes runtime’ına bağlı değildir. Uygulama Next.js, TypeScript,
Tailwind v4, shadcn/ui ve SQLite kullanır.

![Ispatla Market kontrol paneli](docs/assets/ispatla-control-plane.png)

> Görsel, lokal uygulamadan alınmış kontrol paneli ekranıdır. Canlı X hesabı,
> cookie veya production secret içermez.

## Ürün döngüsü

```text
FxTwitter kaynakları
  -> provenance + SQLite intake
  -> quote / reply / mention kaynak keşfi
  -> Luna medium + Terra review kaynak ve Market skoru
  -> hesap style profile ile draft varyantları
  -> quality / uncertainty / rights gate
  -> x-use automation queue
  -> action receipt
  -> FxTwitter exact text + author reconciliation
  -> feedback snapshot + analytics
```

## Neler var?

- Dashboard: scan, operasyon kapıları, sinyal grafiği ve son gözlemler
- Fırsatlar (`/opportunities`, eski `/market` URL’si de çalışır): fırsat skoru,
  freshness, velocity, relevance, risk; AI doğrulanmış ve AI bekleyen kayıtlar
  ayrı görünür
- Draft stüdyosu: original post, quote, reply, thread ve DM formatları; varyant,
  stil bağlamı, gate sonucu, manuel edit, çoklu hesap batch’i ve kuyruğa alma
- Global chat desk: `/generate`, `/post`, `/queue`, `/send`, `/cancel` komutları;
  kalıcı SQLite geçmişi ve gerçek queue/send/cancel işlemlerinde insan onayı
- Yerel usage ledger: XPatla dokümanındaki format kredileri (post 15, quote/reply/DM
  25, thread 100); Stripe veya dış faturalama yok
- Hesap listesi/edit: handle, x-use account id, default hesap, günlük limit,
  otomasyon modu ve stil profili (günlük limit alanı kaydedilir; otomatik yayında
  şu an hesap bazında değil, global 6 yayın/24 saat limiti uygulanır)
- Kaynak yönetimi: takip edilen hesap, max post, enabled/disabled ve rights status
- Otomatik kaynak keşfi: 10 doğrulanmış başlangıç hesabı, hesap avatarı, AI kaynak
  skoru, confidence, pin koruması, aday terfisi ve düşük kaynak yaşam döngüsü

![Ispatla otomatik kaynak keşfi](docs/assets/ispatla-sources.png)
- Yayın kuyruğu: queued, running, pending_reconciliation, confirmed, blocked,
  failed, cancelled; retry bir durum değil tekrar kuyruğa alma aksiyonudur
- Reconciliation: x-use receipt’i tek başına başarı sayılmaz; uzak sonuç
  doğrulanmadan `confirmed` oluşmaz. Uzak doğrulama kanıtı aynı metin ve yazar
  eşleşmesidir; medya eşleşmesi bu kanıtın parçası değildir.
- Key edit: OpenAI ve x-use integration secret’ları server-side AES-256-GCM
  kasada maskeli yönetilir; AI çalıştırıcısı olarak OpenAI Responses API veya
  yerel Codex CLI seçilebilir
- Analytics: draft, queue, confirmed, blocked, failed ve feedback snapshot özeti
- Global automation kill switch ve x-use capability ekranı
- Tema sistemi: sistem varsayılanı, açık/koyu geçişi ve shadcn semantic token’ları

## Çalıştırma

```sh
cp config/sources.example.json config/sources.json
bun install --frozen-lockfile
bun dev
```

Arayüz: `http://localhost:3000`

Kontrol komutları:

```sh
bun test
bun run lint
bun run typecheck
bun run build
bun audit
bun start
```

SQLite state varsayılan olarak `state/ispatla.sqlite3` altında tutulur.
`ISPATLA_SOURCES` ile source JSON, `ISPATLA_DB` ile SQLite dosyası değiştirilebilir.

## x-use kurulumu

x-use Ispatla’ya vendored dependency olarak kopyalanmaz; ayrı bir Python +
Chromium runtime’ı olarak çalışır:

```sh
pipx install x-use-mcp
x-use doctor
x-use --help
```

Alternatif:

```sh
uv tool install x-use-mcp
```

Ispatla `XUSE_BIN` ile binary seçebilir. Varsayılan `x-use` komutudur.
Mevcut doğrulanmış yayın kontratı:

```text
x-use mcp
  initialize
  tools/call queue_post(account, text, media)
  tools/call process_queue(account, max_actions=1)
```

Panel x-use’ın gerçek runtime yardım/doctor çıktısından capability keşfeder ve
stdio MCP JSON-RPC üzerinden yalnız `queue_post` + açık `process_queue` kapısını
çağırır. Receipt yayın kanıtı değildir; text/author/media reconciliation olmadan
`confirmed` oluşmaz. CLI kontratı doğrulanmamış quote/reply/thread/DM aksiyonları
draft olarak kalır.

## Secret ve otomasyon ayarları

Production’da key edit kullanmak için encryption master secret zorunludur:

```sh
export ISPATLA_SECRET_KEY="uzun-rastgele-production-secret"
```

Environment fallback ile OpenAI kullanmak istersen:

```sh
export OPENAI_API_KEY="..."
```

Codex kullanmak için Codex CLI’nin ayrı oturumunu aç:

```sh
codex login
codex login status
```

Ardından `/settings/keys` içindeki AI çalıştırıcısı alanından `OpenAI API` veya
`Codex` ve istediğin modeli seç. Kaynak, Market ve draft çağrıları aynı seçime
uymaya devam eder. Codex yolu `codex exec --ephemeral --sandbox read-only`
ile çalışır; uygulamanın OpenAI API key’i Codex subprocess’ine geçirilmez.
`CODEX_BIN` ile farklı bir Codex binary’si seçilebilir.

Kaynak ve Market skoru varsayılan olarak seçili provider üzerindeki
`gpt-5.6-luna` medium reasoning ile çalışır.
Confidence düşükse, skor 65–75 eşik aralığındaysa veya kaynak silinmek üzereyse
`gpt-5.6-terra` ikinci görüş verir. Model erişimi yoksa terfi, otomatik silme ve
otomatik yayın fail-closed durur; mevcut intake verisi kaybolmaz.

## Kaynak keşfi

İlk çalıştırmada eksik olan şu 10 kaynak bir kez eklenir:

`bpthaber`, `anadoluajansi`, `trthaber`, `ntv`, `bbcturkce`, `dw_turkce`,
`euronews_tr`, `teyitorg`, `t24comtr`, `pusholder`.

Yeni kaynaklar izlenen postların quote yazarı, reply hedefi ve mention
hesaplarından bulunur. Quote 3, reply 2, mention 1 kanıt puanı taşır. Üç kanıt
puanına ulaşan aday AI değerlendirmesine girer; skor ve confidence en az 70 ise
aktifleşir. Sabitlenmemiş bir kaynak üç günlük değerlendirmede 40 altında kalır
ve Terra sonucu doğrularsa kaynak kaydı silinir. Geçmiş post provenance’ı
korunur ve hesap yedi gün yeniden keşfedilmez.

Gösterilen değer Ispatla tahminidir; X'in iç sıralama skoru veya erişim
garantisi değildir.

Otomasyon scheduler’ı kapatmak için:

```sh
export ISPATLA_AUTOMATION=0
```

Production mutation endpoint’leri için:

```sh
export ISPATLA_ADMIN_TOKEN="..."
```

İsteklerde `Authorization: Bearer <token>` gerekir. Token yoksa mutation
endpoint’leri fail-closed `503`, yanlış token `401` döndürür. Production’da
dashboard ve `/api/status` için ayrıca reverse-proxy/auth katmanı önerilir.

Otomatik yayınların FxTwitter üzerinden doğrulanıp `confirmed`’a geçebilmesi
için yayın yapan hesabın handle’ı verilir; bu tanımsızsa denemeler
`pending_reconciliation` durumunda kalır:

```sh
export ISPUBLISHER_HANDLE="yayin-hesabi-handle"
```

Secret değerleri repo, SQLite plaintext alanı, HTML, API response, x-use receipt
ve log içine yazılmaz. x-use cookie/session yönetimi x-use tarafında kalır.

## Yayın güvenliği

- Sensitive kaynaklar otomatik yayın kapısından geçemez.
- Skor, cluster duplicate, global yayın limiti (6/24 saat) ve quality gate
  uygulanır.
- Fotoğraf/video yalnızca `rightsStatus: "cleared"` kaynaklarda allowlist, MIME,
  magic byte, boyut ve SHA-256 kontrollerinden sonra x-use’a verilir.
- Belirsiz write tekrar edilmez; pending reconciliation state korunur.
- x-use yoksa veya doctor/capability başarısızsa panel bunu açıkça gösterir.
- `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` ve
  `Permissions-Policy` güvenlik header’ları aktiftir.

## Araştırma kaynakları

- [X algorithm news account analysis](x-algorithm-news-account-analysis.md)
- [XPatla site algoritma araştırması — 2026-08-21](xpatla-site-algoritma-arastirmasi-2026-08-21.md)
- [Araştırma → uygulama eşlemesi](docs/RESEARCH-MAP.md)
- [Pentest raporu](docs/PENTEST-REPORT.md)

İki Markdown dosyası kaynak metin olarak korunur. Kapalı X ağırlıkları,
XPatla’nın özel skorları veya özel prompt’ları gerçekmiş gibi uydurulmaz.
