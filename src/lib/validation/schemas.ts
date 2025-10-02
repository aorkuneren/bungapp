import { z } from 'zod'

// User schemas
export const UserCreateSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  name: z.string().min(2, 'İsim en az 2 karakter olmalıdır'),
  role: z.enum(['ADMIN', 'RECEPTIONIST']),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalıdır'),
})

export const UserUpdateSchema = UserCreateSchema.partial().omit({ password: true })

export const LoginSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  password: z.string().min(1, 'Şifre gereklidir'),
})

// Bungalow schemas
export const BungalowCreateSchema = z.object({
  name: z.string().min(2, 'Bungalov adı en az 2 karakter olmalıdır'),
  description: z.string().optional(),
  capacity: z.number().int().min(1, 'Kapasite en az 1 olmalıdır'),
  basePrice: z.number().positive('Fiyat pozitif olmalıdır'),
  priceIncludesVat: z.boolean().optional(),
  features: z.record(z.string(), z.any()).optional(),
})

export const BungalowUpdateSchema = z.object({
  name: z.string().min(2, 'Bungalov adı en az 2 karakter olmalıdır'),
  description: z.string().optional(),
  capacity: z.number().int().min(1, 'Kapasite en az 1 olmalıdır'),
  basePrice: z.number().positive('Fiyat pozitif olmalıdır'),
  features: z.record(z.string(), z.any()).optional(),
  status: z.enum(['ACTIVE', 'PASSIVE']).optional(),
})

// Alternative schema for form validation
export const BungalowEditFormSchema = z.object({
  name: z.string().min(2, 'Bungalov adı en az 2 karakter olmalıdır'),
  description: z.string().optional(),
  capacity: z.coerce.number().int().min(1, 'Kapasite en az 1 olmalıdır'),
  basePrice: z.coerce.number().positive('Fiyat pozitif olmalıdır'),
  priceIncludesVat: z.boolean().optional(),
  features: z.record(z.string(), z.any()).optional(),
  status: z.enum(['ACTIVE', 'PASSIVE']).optional(),
})

// Customer schemas
export const CustomerCreateSchema = z.object({
  name: z.string().min(2, 'Ad soyad en az 2 karakter olmalıdır'),
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  phone: z.string().min(7, 'Telefon numarası en az 7 karakter olmalıdır'),
  address: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['ACTIVE', 'BANNED']).default('ACTIVE'),
})

export const CustomerUpdateSchema = CustomerCreateSchema.partial()

// Reservation schemas
export const ReservationCreateSchema = z.object({
  bungalowId: z.string().uuid('Geçerli bir bungalov seçiniz'),
  customerId: z.string().uuid().optional(), // Mevcut müşteri seçilirse
  checkIn: z.coerce.date(),
  checkOut: z.coerce.date(),
  guests: z.number().int().min(1, 'En az 1 misafir olmalıdır'),
  customerName: z.string().min(2, 'Müşteri adı en az 2 karakter olmalıdır'),
  customerEmail: z.string().email('Geçerli bir e-posta adresi giriniz'),
  customerPhone: z.string().min(7, 'Telefon numarası en az 7 karakter olmalıdır'),
  notes: z.string().optional(),
  extras: z.array(z.object({
    code: z.string(),
    qty: z.number().int().min(1),
  })).optional(),
}).superRefine((data, ctx) => {
  if (data.checkOut <= data.checkIn) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Çıkış tarihi giriş tarihinden sonra olmalıdır',
      path: ['checkOut'],
    })
  }
})

export const ReservationUpdateSchema = ReservationCreateSchema.partial().omit({
  bungalowId: true,
  checkIn: true,
  checkOut: true,
})

export const ReservationStatusUpdateSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED']),
})

// Price rule schemas
export const PriceRuleCreateSchema = z.object({
  name: z.string().min(2, 'Kural adı en az 2 karakter olmalıdır'),
  type: z.enum(['SEASON', 'WEEKEND', 'HOLIDAY', 'MIN_NIGHTS', 'PER_PERSON', 'CUSTOM']),
  dateStart: z.coerce.date().optional(),
  dateEnd: z.coerce.date().optional(),
  weekdayMask: z.array(z.boolean()).length(7).optional(),
  amountType: z.enum(['FIXED', 'PERCENT', 'PER_PERSON', 'NIGHTLY']),
  amountValue: z.number().positive('Miktar pozitif olmalıdır'),
  appliesTo: z.enum(['GLOBAL', 'BUNGALOW']),
  bungalowId: z.string().uuid().optional(),
})

export const PriceRuleUpdateSchema = PriceRuleCreateSchema.partial()

// Quote request schema
export const QuoteRequestSchema = z.object({
  bungalowId: z.string().uuid(),
  checkIn: z.coerce.date(),
  checkOut: z.coerce.date(),
  guests: z.number().int().min(1),
  extras: z.array(z.object({
    code: z.string(),
    qty: z.number().int().min(1),
  })).optional(),
}).superRefine((data, ctx) => {
  if (data.checkOut <= data.checkIn) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Çıkış tarihi giriş tarihinden sonra olmalıdır',
      path: ['checkOut'],
    })
  }
})

// Report schemas
export const ReportDateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).superRefine((data, ctx) => {
  if (data.endDate < data.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Bitiş tarihi başlangıç tarihinden önce olamaz',
      path: ['endDate'],
    })
  }
})

// File upload schemas
export const ImageUploadSchema = z.object({
  bungalowId: z.string().uuid(),
  alt: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
})

