# 🚀 Vercel + Neon Deployment Rehberi

## 📋 Deployment Checklist

### ✅ Ön Hazırlık
- [ ] GitHub repository'si hazır
- [ ] Neon hesabı oluşturuldu
- [ ] Vercel hesabı oluşturuldu
- [ ] Proje build ediliyor (`npm run build`)

### ✅ Neon Veritabanı Kurulumu
- [ ] Neon'da yeni database oluşturuldu
- [ ] Connection string kopyalandı
- [ ] Mevcut veriler import edildi (opsiyonel)

### ✅ Vercel Proje Kurulumu
- [ ] GitHub repository bağlandı
- [ ] Framework: Next.js seçildi
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `.next`

### ✅ Environment Variables
- [ ] `DATABASE_URL` - Neon connection string
- [ ] `DIRECT_URL` - Neon direct connection string
- [ ] `NEXTAUTH_URL` - Vercel app URL
- [ ] `NEXTAUTH_SECRET` - Güçlü secret key
- [ ] `NODE_ENV` - production

### ✅ Post-Deployment
- [ ] İlk deployment başarılı
- [ ] Veritabanı bağlantısı test edildi
- [ ] Admin kullanıcısı oluşturuldu
- [ ] Uygulama erişilebilir durumda

## 🔧 Adım Adım Deployment

### 1. Neon Veritabanı
```bash
# 1. Neon dashboard'da yeni database oluştur
# 2. Connection string'i kopyala
# 3. Mevcut verileri import et (opsiyonel)
pg_dump -h localhost -U your_username -d your_database_name > backup.sql
psql "postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require" < backup.sql
```

### 2. Vercel Deployment
```bash
# 1. GitHub'a push et
git add .
git commit -m "Vercel deployment hazırlığı"
git push origin main

# 2. Vercel'de proje oluştur
# 3. Environment variables ekle
# 4. Deploy et
```

### 3. İlk Kullanıcı Oluşturma
```bash
# Vercel'de Functions tab'ında yeni function oluştur
# create-admin.js
const { PrismaClient } = require('@prisma/client')
const { hash } = require('argon2')

async function createAdmin() {
  const prisma = new PrismaClient()
  try {
    const hashedPassword = await hash('admin123')
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
    })
    console.log('Admin kullanıcısı oluşturuldu!')
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()
```

## 🐛 Sorun Giderme

### Build Hataları
- **Prisma generate hatası**: `postinstall` script'i çalışıyor mu kontrol edin
- **TypeScript hatası**: `npm run build` yerel olarak çalışıyor mu test edin
- **Environment variable hatası**: Vercel'de tüm gerekli değişkenler tanımlı mı kontrol edin

### Runtime Hataları
- **Database connection**: Neon connection string doğru mu kontrol edin
- **NextAuth hatası**: `NEXTAUTH_URL` ve `NEXTAUTH_SECRET` doğru mu kontrol edin
- **CORS hatası**: Vercel domain'i `NEXTAUTH_URL`'de doğru mu kontrol edin

### Performance Optimizasyonları
- **Image optimization**: Next.js Image component kullanın
- **Bundle size**: `npm run build:analyze` ile bundle'ı analiz edin
- **Database queries**: Prisma query'lerini optimize edin

## 📊 Monitoring

### Vercel Analytics
- Vercel dashboard'da Analytics tab'ını kullanın
- Performance metriklerini takip edin
- Error rate'leri izleyin

### Neon Monitoring
- Neon dashboard'da database metrics'i kontrol edin
- Connection count'u izleyin
- Query performance'ı takip edin

## 🔄 Güncelleme Süreci

### Code Updates
```bash
# 1. Değişiklikleri yap
# 2. Test et
npm run build
npm run start

# 3. GitHub'a push et
git add .
git commit -m "Update: description"
git push origin main

# 4. Vercel otomatik deploy edecek
```

### Database Updates
```bash
# 1. Migration oluştur
npx prisma migrate dev --name update-description

# 2. GitHub'a push et
git add .
git commit -m "Database: migration update"
git push origin main

# 3. Vercel otomatik migration çalıştıracak
```

## 🚨 Güvenlik

### Environment Variables
- Production secret'ları güçlü olmalı
- `NEXTAUTH_SECRET` en az 32 karakter
- Database password'ü karmaşık olmalı

### Database Security
- Neon'da IP whitelist kullanın
- Connection pooling aktif
- SSL bağlantı zorunlu

### Application Security
- HTTPS zorunlu (Vercel otomatik)
- CORS ayarları yapılandırılmış
- Rate limiting aktif

## 📞 Destek

### Vercel Support
- [Vercel Docs](https://vercel.com/docs)
- [Vercel Community](https://github.com/vercel/vercel/discussions)

### Neon Support
- [Neon Docs](https://neon.tech/docs)
- [Neon Community](https://community.neon.tech)

### Proje Support
- GitHub Issues kullanın
- Detaylı hata mesajları ekleyin
- Log dosyalarını paylaşın
