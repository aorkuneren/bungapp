export interface ReservationEmailData {
  customerName: string
  customerEmail: string
  reservationCode: string
  bungalowName: string
  checkIn: string
  checkOut: string
  nights: number
  guests: number
  totalAmount: number
  status: string
}

export const emailTemplates = {
  reservationConfirmation: (data: ReservationEmailData) => ({
    subject: `Rezervasyon Onayı - ${data.reservationCode}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Rezervasyon Onayı</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .reservation-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-label { font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          .status-confirmed { color: #059669; font-weight: bold; }
          .status-pending { color: #d97706; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏖️ BungApp</h1>
            <h2>Rezervasyon Onayı</h2>
          </div>
          
          <div class="content">
            <p>Sayın <strong>${data.customerName}</strong>,</p>
            <p>Rezervasyonunuz başarıyla oluşturulmuştur. Aşağıda rezervasyon detaylarınızı bulabilirsiniz:</p>
            
            <div class="reservation-details">
              <div class="detail-row">
                <span class="detail-label">Rezervasyon Kodu:</span>
                <span>${data.reservationCode}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Bungalov:</span>
                <span>${data.bungalowName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Giriş Tarihi:</span>
                <span>${data.checkIn}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Çıkış Tarihi:</span>
                <span>${data.checkOut}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Gece Sayısı:</span>
                <span>${data.nights} gece</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Misafir Sayısı:</span>
                <span>${data.guests} kişi</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Toplam Tutar:</span>
                <span>₺${data.totalAmount.toLocaleString()}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Durum:</span>
                <span class="status-${data.status.toLowerCase()}">${
                  data.status === 'CONFIRMED' ? 'Onaylandı' : 
                  data.status === 'PENDING' ? 'Beklemede' : 
                  data.status
                }</span>
              </div>
            </div>
            
            <p>Rezervasyonunuzla ilgili herhangi bir sorunuz olursa lütfen bizimle iletişime geçin.</p>
            <p>İyi tatiller dileriz!</p>
          </div>
          
          <div class="footer">
            <p>BungApp Rezervasyon Sistemi</p>
            <p>Bu e-posta otomatik olarak gönderilmiştir.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  reservationCancellation: (data: ReservationEmailData) => ({
    subject: `Rezervasyon İptali - ${data.reservationCode}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Rezervasyon İptali</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .reservation-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-label { font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏖️ BungApp</h1>
            <h2>Rezervasyon İptali</h2>
          </div>
          
          <div class="content">
            <p>Sayın <strong>${data.customerName}</strong>,</p>
            <p>Rezervasyonunuz iptal edilmiştir. İptal edilen rezervasyon detayları:</p>
            
            <div class="reservation-details">
              <div class="detail-row">
                <span class="detail-label">Rezervasyon Kodu:</span>
                <span>${data.reservationCode}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Bungalov:</span>
                <span>${data.bungalowName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Giriş Tarihi:</span>
                <span>${data.checkIn}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Çıkış Tarihi:</span>
                <span>${data.checkOut}</span>
              </div>
            </div>
            
            <p>İptal işlemi ile ilgili herhangi bir sorunuz olursa lütfen bizimle iletişime geçin.</p>
            <p>Tekrar görüşmek üzere!</p>
          </div>
          
          <div class="footer">
            <p>BungApp Rezervasyon Sistemi</p>
            <p>Bu e-posta otomatik olarak gönderilmiştir.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  checkInReminder: (data: ReservationEmailData) => ({
    subject: `Giriş Hatırlatması - ${data.reservationCode}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Giriş Hatırlatması</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #059669; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .reservation-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-label { font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏖️ BungApp</h1>
            <h2>Giriş Hatırlatması</h2>
          </div>
          
          <div class="content">
            <p>Sayın <strong>${data.customerName}</strong>,</p>
            <p>Yarın giriş yapacağınız rezervasyonunuzu hatırlatmak isteriz:</p>
            
            <div class="reservation-details">
              <div class="detail-row">
                <span class="detail-label">Rezervasyon Kodu:</span>
                <span>${data.reservationCode}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Bungalov:</span>
                <span>${data.bungalowName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Giriş Tarihi:</span>
                <span>${data.checkIn}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Çıkış Tarihi:</span>
                <span>${data.checkOut}</span>
              </div>
            </div>
            
            <p>Giriş saatimiz 14:00'dır. Herhangi bir sorunuz olursa lütfen bizimle iletişime geçin.</p>
            <p>İyi tatiller dileriz!</p>
          </div>
          
          <div class="footer">
            <p>BungApp Rezervasyon Sistemi</p>
            <p>Bu e-posta otomatik olarak gönderilmiştir.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),
}
