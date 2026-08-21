# Ispatla

Bağımsız Next.js + TypeScript + Tailwind v4 + shadcn/ui uygulaması. Vesper ya da
Hermes runtime’ına bağlı değildir; XPatla’nın araştırma → Market → kalite →
yayın → feedback döngüsünü kendi SQLite state’iyle yürütür.

```text
FxTwitter kaynakları
  -> provenance + SQLite state
  -> freshness/velocity fırsat skoru
  -> OpenAI Responses özgün Türkçe taslak
  -> quality / uncertainty / rights gate
  -> x-use text/photo/video publish
  -> FxTwitter exact text + author + media reconciliation
```

## Çalıştırma

```sh
cp config/sources.example.json config/sources.json
bun install --frozen-lockfile
bun dev
```

Arayüz `http://localhost:3000` adresinde açılır. Production kontrolü:

```sh
bun run lint
bun test
bun run typecheck
bun run build
bun start
```

SQLite state `state/ispatla.sqlite3` altında tutulur. `ISPATLA_SOURCES` ile
başka bir kaynak JSON’u, `ISPATLA_DB` ile başka bir SQLite dosyası seçilebilir.
Kaynaklar `https://api.fxtwitter.com/2/profile/<handle>/statuses` üzerinden
okunur; ham tweet, author, timestamp, engagement, medya ve URL provenance olarak
saklanır.

## Otomasyon ve yayın sınırı

Sunucu Node.js üzerinde çalışırken beş dakikalık scheduler taramayı tetikler.
`ISPATLA_AUTOMATION=0` ile kapatılabilir. Yayın için:

- `OPENAI_API_KEY` olmadan taslak üretimi ve yayın bloke edilir.
- Fırsat skoru 70’in altında, sensitive, tekrar cluster’ı veya günlük 6 post
  sınırı geçilirse otomatik yayın yapılmaz.
- Fotoğraf/video yalnızca kaynak `rightsStatus: "cleared"` ise allowlist, MIME,
  magic byte, boyut ve SHA-256 kapılarından geçtikten sonra x-use’a verilir.
- `x-use` çıktısı action receipt’tir; FxTwitter üzerinde exact metin, author ve
  medya eşleşmesi görülmeden state `confirmed` olmaz. Belirsiz write tekrar
  edilmez.
- Reconciliation için yayın hesabı `ISPUBLISHER_HANDLE` ile tanımlanır; bu bilgi
  yoksa uzak write `pending_reconciliation` olarak kalır.
- x-use çağrısı `XUSE_BIN` ile seçilir; varsayılan komut `x-use`, beklenen
  kontrat `x-use post --text "..." [--media /local/path]` biçimindedir.

`OPENAI_API_KEY`, x-use credential’ı veya cookie’ler repo/config/log içine
yazılmaz. `x-use` makinede yoksa panel bunu açıkça `ulaşılamıyor` gösterir.

## Araştırma kaynakları

- [X algorithm news account analysis](x-algorithm-news-account-analysis.md)
- [XPatla site algorithm research — 2026-08-21](xpatla-site-algoritma-arastirmasi-2026-08-21.md)
- [Araştırma → uygulama eşlemesi](docs/RESEARCH-MAP.md)

Bu iki Markdown dosyası kaynak metin olarak korunur; kapalı X ağırlıkları,
XPatla’nın özel skorları veya özel prompt’ları uydurulmaz.
