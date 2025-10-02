# 🏨 BungApp - Rezervasyon Yönetim Sistemi

BungApp, turizm ve konaklama sektörü için geliştirilmiş modern bir rezervasyon yönetim sistemidir. Yönetici ve resepsiyonist kullanıcıları için tasarlanmış olup, bungalov yönetimi, rezervasyon takibi, gelişmiş fiyat motoru ve kapsamlı raporlama özelliklerini içerir.

## 🚀 Özellikler

### 🎯 Ana Modüller
- **📅 Rezervasyon Yönetimi**: Giriş/çıkış seçimi, otomatik fiyat hesaplama, durum takibi, e-posta bildirimleri
- **🏠 Bungalov Yönetimi**: Sınırsız kayıt, görsel galeri, özellik yönetimi, aktif/pasif durum
- **📊 Raporlama**: Gelir analizi, doluluk oranları, personel performansı
- **👥 Kullanıcı & Rol Yönetimi**: Admin ve resepsiyonist rolleri
- **📝 Loglama & Denetim**: Tüm işlemlerin kayıt altına alınması
- **📧 Bildirimler**: SMTP e-posta entegrasyonu
- **⚙️ Sistem Bakımı**: Veritabanı yedekleme, cache temizleme, güvenlik taraması

### 🛠️ Teknik Özellikler
- **Framework**: Next.js 15 (App Router)
- **UI**: React 18, Tailwind CSS, shadcn/ui
- **Formlar**: react-hook-form + zod validasyonu
- **Veritabanı**: PostgreSQL + Prisma ORM
- **Kimlik Doğrulama**: NextAuth.js
- **Önbellek**: Redis (ioredis)
- **Depolama**: S3 uyumlu (AWS S3 / MinIO)
- **Dil**: TypeScript (tamamı)
- **E-posta**: Nodemailer

## 🛠️ Kurulum

### Gereksinimler
- Node.js 18+
- PostgreSQL 14+ (önerilen: 15+)
- Redis (opsiyonel, cache için)
- npm veya yarn

### Hızlı Başlangıç

1. **Projeyi klonlayın**
   ```bash
   git clone https://github.com/aorkuneren/bung-app.git
   cd bung-app
   ```

2. **Bağımlılıkları yükleyin**
   ```bash
   npm install
   ```

3. **PostgreSQL'i kurun ve başlatın** (macOS için)
   ```bash
   # Homebrew ile kurulum
   brew install postgresql@15
   brew services start postgresql@15
   
   # Veritabanı oluşturun
   createdb bungapp
   ```

4. **Çevre değişkenlerini yapılandırın**
   ```bash
   cp .env.example .env
   ```
   
   `.env` dosyasını düzenleyerek gerekli değerleri girin:
   ```env
   # Database (zorunlu)
   DATABASE_URL="postgresql://macmini@localhost:5432/bungapp"
   
   # NextAuth (zorunlu)
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here-change-in-production"
   JWT_SECRET="your-jwt-secret-here-change-in-production"
   
   # Redis (opsiyonel - cache için)
   REDIS_URL="redis://localhost:6379"
   
   # SMTP (opsiyonel - e-posta için)
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT="587"
   SMTP_USER="your-email@gmail.com"
   SMTP_PASS="your-app-password"
   MAIL_FROM="BungApp <noreply@bungapp.com>"
   
   # S3 (opsiyonel - dosya yükleme için)
   S3_ENDPOINT="https://s3.amazonaws.com"
   S3_REGION="us-east-1"
   S3_BUCKET="bungapp-uploads"
   S3_ACCESS_KEY="your-access-key"
   S3_SECRET_KEY="your-secret-key"
   ```

5. **Veritabanını hazırlayın**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

6. **Admin kullanıcısı oluşturun**
   ```bash
   node -e "
   const { PrismaClient } = require('@prisma/client');
   const { hash } = require('argon2');
   
   async function createAdmin() {
     const prisma = new PrismaClient();
     try {
       const hashedPassword = await hash('admin123');
       const admin = await prisma.user.upsert({
         where: { email: 'admin@bungapp.com' },
         update: {},
         create: {
           email: 'admin@bungapp.com',
           name: 'Admin User',
           role: 'ADMIN',
           passwordHash: hashedPassword,
           isActive: true
         }
       });
       console.log('Admin kullanıcısı oluşturuldu: admin@bungapp.com / admin123');
     } finally {
       await prisma.\$disconnect();
     }
   }
   createAdmin();
   "
   ```

7. **Geliştirme sunucusunu başlatın**
   ```bash
   npm run dev
   ```

8. **Uygulamayı açın**
   Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresine gidin.
   
   **Giriş Bilgileri:**
   - Email: `admin@bungapp.com`
   - Şifre: `admin123`

## 📁 Proje Yapısı

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Kimlik doğrulama sayfaları
│   │   └── auth/login/    # Giriş sayfası
│   ├── (dashboard)/       # Dashboard sayfaları
│   │   ├── dashboard/     # Ana dashboard
│   │   ├── bungalows/     # Bungalov yönetimi
│   │   ├── reservations/  # Rezervasyon yönetimi
│   │   ├── customers/     # Müşteri yönetimi
│   │   ├── reports/       # Raporlar
│   │   └── settings/      # Sistem ayarları
│   ├── api/               # API route'ları
│   │   ├── auth/          # NextAuth endpoints
│   │   ├── bungalows/     # Bungalov API
│   │   ├── reservations/  # Rezervasyon API
│   │   ├── customers/     # Müşteri API
│   │   ├── system/        # Sistem API (backup, cache, info)
│   │   └── price-rules/   # Fiyat kuralları API
│   └── globals.css        # Global stiller
├── components/            # React bileşenleri
│   ├── ui/               # shadcn/ui bileşenleri
│   ├── forms/            # Form bileşenleri
│   └── layout/           # Layout bileşenleri
├── lib/                  # Yardımcı kütüphaneler
│   ├── auth/             # NextAuth yapılandırması
│   ├── db/               # Prisma client
│   ├── pricing/          # Fiyat motoru
│   ├── validation/       # Zod şemaları
│   ├── mail/             # E-posta servisleri
│   └── performance/      # Cache yönetimi
├── prisma/               # Prisma şeması ve migrasyonlar
├── scripts/              # Yardımcı scriptler
└── tests/                # Test dosyaları
```

## 🔐 Kullanıcı Rolleri

### 👑 Admin
- ✅ Tüm CRUD işlemleri (kullanıcı, fiyat kuralı, raporlar, log görüntüleme)
- ✅ Sistem ayarlarına tam erişim
- ✅ Fiyat kurallarını yönetme
- ✅ Veritabanı yedekleme
- ✅ Cache temizleme
- ✅ Güvenlik taraması
- ✅ Sistem durumu izleme

### 👨‍💼 Resepsiyonist
- ✅ Rezervasyon oluşturma/güncelleme/iptal etme
- ✅ Bungalov görüntüleme ve sınırlı düzenleme
- ✅ Müşteri yönetimi
- ✅ Raporları görüntüleme (salt okunur)
- ❌ Sistem ayarları (erişim yok)
- ❌ Kullanıcı yönetimi (erişim yok)

## 💰 Fiyat Motoru

BungApp'in gelişmiş fiyat motoru aşağıdaki kuralları destekler:

### Kural Türleri
- **🌞 Sezon Fiyatlandırması**: Tarih aralığına göre fiyat değişiklikleri
- **🎉 Hafta Sonu Fiyatlandırması**: Cumartesi ve Pazar günleri için özel fiyatlar
- **🎊 Tatil Fiyatlandırması**: Resmi tatiller için özel fiyatlar
- **🛏️ Minimum Gece**: Belirli dönemler için minimum kalış süresi
- **👥 Kişi Başı Ek Ücret**: Standart kapasiteyi aşan misafirler için ek ücret
- **⚙️ Özel Kurallar**: Özelleştirilebilir fiyat kuralları

### Uygulama Sırası
1. Minimum gece kontrolü (validasyon)
2. Sezon/Tatil/Hafta sonu kuralları (taban fiyat uyarlamaları)
3. Kişi başı ek ücretler
4. Özel kurallar (yüzde/sabit ilave/iskonto)

## 📊 Raporlama

### Mevcut Raporlar
- **💰 Gelir Raporları**: Tarih aralığına göre gelir analizi
- **🏠 Doluluk Raporları**: Bungalov ve tarih bazlı doluluk oranları
- **👨‍💼 Personel Raporları**: Kullanıcı başına performans metrikleri
- **📈 Özet Kartları**: Anlık metrikler ve KPI'lar

### Dashboard Metrikleri
- Bu ay toplam gelir
- Doluluk oranı (%)
- Ortalama gece sayısı
- Aktif rezervasyon sayısı

## ⚙️ Sistem Bakımı

### Mevcut Özellikler
- **💾 Veritabanı Yedekleme**: PostgreSQL pg_dump ile otomatik yedekleme
- **🗑️ Cache Temizleme**: Redis cache temizleme (tümü, rezervasyonlar, bungalovlar)
- **📊 Sistem Durumu**: Servis sağlığı, kaynak kullanımı, sistem bilgileri
- **🔒 Güvenlik Taraması**: Güvenlik açıklarını kontrol etme

### Sistem Durumu İzleme
- **Servisler**: Database, Redis, Email, Storage bağlantı durumu
- **Kaynaklar**: CPU, Memory, Disk kullanımı
- **Sistem**: Uygulama versiyonu, Node.js versiyonu, platform, uptime

## 🔒 Güvenlik

### Kimlik Doğrulama & Yetkilendirme
- **NextAuth.js**: Güvenli session yönetimi
- **Argon2**: Parola hashleme
- **JWT**: Token tabanlı kimlik doğrulama
- **Rol Tabanlı Erişim**: Kullanıcı rollerine göre yetkilendirme

### Veri Güvenliği
- **Zod Validasyonu**: Tüm giriş verilerinin doğrulanması
- **Audit Log**: Tüm kritik işlemlerin kayıt altına alınması
- **CSRF Koruması**: Cross-site request forgery koruması
- **SQL Injection Koruması**: Prisma ORM ile güvenli sorgular

### Güvenlik Başlıkları
- **CSP**: Content Security Policy
- **HSTS**: HTTP Strict Transport Security
- **X-Frame-Options**: Clickjacking koruması
- **X-Content-Type-Options**: MIME type sniffing koruması

## 🧪 Test

```bash
# Unit testler
npm run test

# E2E testler
npm run test:e2e

# Linting
npm run lint

# Type checking
npm run type-check

# Build testi
npm run build
```

## 🚀 Production Deployment

### Environment Variables (Production)
```env
# Database
DATABASE_URL="postgresql://user:password@prod-host:5432/bungapp"

# Auth (güçlü secret'lar kullanın)
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="strong-random-secret-for-production"
JWT_SECRET="another-strong-random-secret"

# Redis
REDIS_URL="redis://prod-redis:6379"

# SMTP
SMTP_HOST="your-smtp-provider.com"
SMTP_PORT="587"
SMTP_USER="your-production-email"
SMTP_PASS="your-production-password"

# S3
S3_ENDPOINT="https://s3.amazonaws.com"
S3_REGION="your-region"
S3_BUCKET="your-production-bucket"
S3_ACCESS_KEY="your-production-access-key"
S3_SECRET_KEY="your-production-secret-key"
```

### Build & Deploy
```bash
# Production build
npm run build

# Start production server
npm start
```

## 📝 API Endpoints

### Authentication
- `POST /api/auth/login` - Kullanıcı girişi
- `GET /api/auth/session` - Session bilgisi

### Bungalows
- `GET /api/bungalows` - Bungalov listesi
- `POST /api/bungalows` - Yeni bungalov
- `GET /api/bungalows/[id]` - Bungalov detayı
- `PATCH /api/bungalows/[id]` - Bungalov güncelleme

### Reservations
- `GET /api/reservations` - Rezervasyon listesi
- `POST /api/reservations` - Yeni rezervasyon
- `POST /api/reservations/quote` - Fiyat teklifi
- `GET /api/reservations/availability` - Müsaitlik kontrolü

### System
- `GET /api/system/info` - Sistem durumu
- `POST /api/system/backup` - Veritabanı yedekleme
- `DELETE /api/system/cache` - Cache temizleme
- `POST /api/system/security-scan` - Güvenlik taraması

## 🐛 Sorun Giderme

### Yaygın Sorunlar

1. **PostgreSQL bağlantı hatası**
   ```bash
   # PostgreSQL servisini başlatın
   brew services start postgresql@15
   
   # Veritabanının var olduğunu kontrol edin
   psql -l | grep bungapp
   ```

2. **Backup hatası (version mismatch)**
   ```bash
   # PostgreSQL 15 client tools kullanıldığından emin olun
   /opt/homebrew/Cellar/postgresql@15/15.14/bin/pg_dump --version
   ```

3. **Port 3000 kullanımda**
   ```bash
   # Kullanımdaki portu bulun ve sonlandırın
   lsof -ti:3000 | xargs kill -9
   ```

4. **Redis bağlantı hatası**
   ```bash
   # Redis'i başlatın
   brew services start redis
   ```

### Log Dosyaları
- Development: Console output
- Production: Pino logger ile structured logging

## 📄 Lisans

Bu proje özel lisans altındadır. Tüm hakları saklıdır.

## 🤝 Katkıda Bulunma

1. Projeyi fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add some amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

### Commit Mesaj Formatı
```
feat: yeni özellik eklendi
fix: hata düzeltildi
docs: dokümantasyon güncellendi
style: kod formatı düzeltildi
refactor: kod yeniden düzenlendi
test: test eklendi
chore: genel bakım
```

## 📞 Destek

Herhangi bir sorunuz veya öneriniz için lütfen GitHub Issues kullanın.

## 🔄 Changelog

### v1.0.0 (2024-10-02)
- ✅ İlk stabil sürüm
- ✅ Rezervasyon yönetimi
- ✅ Bungalov yönetimi
- ✅ Fiyat motoru
- ✅ Kullanıcı rolleri
- ✅ Sistem bakım araçları
- ✅ PostgreSQL backup desteği
- ✅ Redis cache yönetimi

---

**🏨 BungApp** - Modern rezervasyon yönetimi için tasarlandı.

*Made with ❤️ using Next.js, TypeScript, and PostgreSQL*