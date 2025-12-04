# 🏗️ Fatura Veri Çıkarıcı | Invoice Data Extractor

Modern ve güçlü bir yapay zeka destekli fatura veri çıkarma sistemi. İnşaat sektörü için özelleştirilmiş, GPT-4o-mini AI kullanarak PDF faturalardan otomatik veri çıkarımı yapar.

## ✨ Özellikler

- 📄 **PDF Yükleme**: Birden fazla PDF faturayı aynı anda yükleyin
- 🤖 **AI Destekli**: GPT-4o-mini ile akıllı veri çıkarımı
- 🌍 **Çok Dilli**: Farklı dillerdeki faturaları destekler
- 📊 **Excel Export**: Çıkarılan verileri Excel formatında indirin
- 🎨 **Modern UI**: Responsive ve kullanıcı dostu arayüz
- ⚡ **Hızlı İşleme**: Paralel işleme ile hızlı sonuçlar
- 🔒 **Güvenli**: Veriler sunucuda saklanmaz

## 🎯 Çıkarılan Veriler

Sistem şu bilgileri otomatik olarak çıkarır:

- Fatura tarihi
- Tedarikçi/Firma adı
- Beton türü/tipi (C25, C30, vb.)
- Miktar ve birim (m³, ton, vb.)
- Birim fiyat
- Toplam tutar
- Para birimi
- Araç plaka numaraları
- Ek notlar

## 🚀 Kurulum

### Gereksinimler

- Node.js 18+
- npm veya yarn
- OpenAI API Key ([buradan alın](https://platform.openai.com/api-keys))

### Adımlar

1. **Projeyi klonlayın veya indirin**

2. **Bağımlılıkları yükleyin**
   ```bash
   npm install
   ```

3. **Environment değişkenlerini ayarlayın**

   `.env.example` dosyasını `.env` olarak kopyalayın:
   ```bash
   cp .env.example .env
   ```

   Ardından `.env` dosyasını düzenleyin ve OpenAI API key'inizi ekleyin:
   ```env
   OPENAI_API_KEY=your_actual_api_key_here
   ```

4. **Development sunucusunu başlatın**
   ```bash
   npm run dev
   ```

5. **Tarayıcınızda açın**

   [http://localhost:3000](http://localhost:3000) adresine gidin

## 📖 Kullanım

1. **PDF Yükleme**: Ana sayfada "PDF faturalarınızı sürükleyip bırakın" alanına faturalarınızı yükleyin
2. **İşleme**: "Verileri Çıkar" butonuna tıklayın
3. **Sonuçlar**: Çıkarılan veriler tabloda görüntülenecek
4. **Excel İndir**: "Excel İndir" butonu ile verileri bilgisayarınıza kaydedin

## 🏗️ Teknoloji Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI**: GPT-4o-mini (OpenAI)
- **PDF Processing**: pdf-parse
- **Excel Generation**: ExcelJS
- **File Upload**: react-dropzone
- **Icons**: Lucide React

## 📁 Proje Yapısı

```
abim-invoice-extractor/
├── app/
│   ├── api/
│   │   ├── extract/       # PDF işleme API endpoint
│   │   └── download/      # Excel indirme API endpoint
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx           # Ana sayfa
├── components/
│   ├── ui/                # UI component'leri
│   └── FileUpload.tsx     # Dosya yükleme component'i
├── lib/
│   ├── openai.ts          # OpenAI GPT-4o-mini API entegrasyonu
│   ├── excel.ts           # Excel oluşturma
│   ├── types.ts           # TypeScript type'ları
│   └── utils.ts           # Utility fonksiyonlar
└── package.json
```

## 💰 Maliyet

OpenAI API kullanımı token bazlı ücretlendirilir:

- **GPT-4o-mini** (kullanılan model):
  - Input: $0.15 / 1M tokens
  - Output: $0.60 / 1M tokens
  - Cache: $0.075 / 1M tokens
- **Alternatif modeller**:
  - GPT-4o: $2.50 / $10 per 1M tokens
  - GPT-4.1: $2.00 / $8.00 per 1M tokens

Ortalama bir fatura işleme maliyeti: **~$0.003-0.008** (GPT-4o-mini ile - çok ekonomik!)

## 🚢 Production Deployment

### Vercel (Önerilen)

1. [Vercel](https://vercel.com) hesabı oluşturun
2. GitHub reponuzu bağlayın
3. Environment variable ekleyin: `OPENAI_API_KEY`
4. Deploy edin!

### Diğer Platformlar

- **AWS**: Amplify veya EC2
- **Google Cloud**: Cloud Run
- **DigitalOcean**: App Platform
- **Railway**: Kolay deployment

Environment variable'ı her platformda `OPENAI_API_KEY` olarak ekleyin.

## 🔧 Özelleştirme

### Çıkarılan Alanları Değiştirme

`lib/openai.ts` dosyasındaki prompt'u düzenleyin:

```typescript
const prompt = `Bu PDF faturadan aşağıdaki bilgileri çıkar...`;
```

### Excel Formatını Değiştirme

`lib/excel.ts` dosyasındaki sütunları düzenleyin:

```typescript
worksheet.columns = [
  { header: "Dosya Adı", key: "fileName", width: 30 },
  // Yeni sütunlar ekleyin...
];
```

### UI Renklerini Değiştirme

`tailwind.config.ts` ve `app/globals.css` dosyalarını düzenleyin.

## 🐛 Sorun Giderme

### API Key Hatası
- `.env` dosyasının doğru konumda olduğundan emin olun
- API key'in geçerli olduğunu kontrol edin
- Development sunucusunu yeniden başlatın

### PDF İşleme Hatası
- PDF'in bozuk olmadığından emin olun
- Dosya boyutunun 50MB'dan küçük olduğundan emin olun
- Farklı bir PDF ile deneyin

### Excel İndirme Sorunu
- Tarayıcı pop-up engelleyicisini kontrol edin
- Console'da hata olup olmadığına bakın

## 📝 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 🤝 Katkıda Bulunma

Pull request'ler memnuniyetle karşılanır! Büyük değişiklikler için lütfen önce bir issue açın.

## 📧 İletişim

Sorularınız için issue açabilirsiniz.

---

**Yapay Zeka ile Güçlendirilmiş** 🤖 | **GPT-4o-mini (OpenAI)** tarafından desteklenmektedir
