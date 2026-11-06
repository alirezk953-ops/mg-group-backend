import prisma from "./prisma";
import { sendAdminDirectAlert } from "./adminNotifier";

export interface RegisterWarrantyParams {
  orderId?: number;
  userId?: number;
  customerName: string;
  customerPhone: string;
  productName: string;
  serialNumber?: string;
  warrantyMonths?: number;
}

export class WarrantyService {
  /**
   * تسجيل بطاقة ضمان رسمية لجهاز مباع من MG Group
   */
  static async registerWarranty(params: RegisterWarrantyParams) {
    const {
      orderId,
      userId,
      customerName,
      customerPhone,
      productName,
      serialNumber,
      warrantyMonths = 12,
    } = params;

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + warrantyMonths);

    const warrantyCode = `MG-W-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    return await prisma.warrantyRecord.create({
      data: {
        warrantyCode,
        orderId,
        userId,
        customerName,
        customerPhone,
        productName,
        serialNumber: serialNumber || `SN-${Math.floor(100000 + Math.random() * 900000)}`,
        startDate,
        endDate,
        status: "ACTIVE",
      },
      include: {
        tickets: true,
      },
    });
  }

  /**
   * الاستعلام عن الضمان برقم التليفون أو كود الضمان
   */
  static async searchWarranty(query: string) {
    const clean = query.trim();
    return await prisma.warrantyRecord.findMany({
      where: {
        OR: [
          { customerPhone: { contains: clean } },
          { warrantyCode: { contains: clean } },
          { serialNumber: { contains: clean } },
          { customerName: { contains: clean } },
        ],
      },
      include: {
        tickets: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * جلب كافة سجلات الضمان
   */
  static async getAllWarranties() {
    return await prisma.warrantyRecord.findMany({
      include: {
        tickets: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * تسجيل تذكرة صيانة أو استبدال لجهاز تحت الضمان
   */
  static async createMaintenanceTicket(params: {
    warrantyId: number;
    issueDescription: string;
  }) {
    const { warrantyId, issueDescription } = params;

    const warranty = await prisma.warrantyRecord.findUnique({
      where: { id: warrantyId },
    });

    if (!warranty) {
      throw new Error("سجل الضمان غير موجود");
    }

    const ticket = await prisma.maintenanceTicket.create({
      data: {
        warrantyId,
        issueDescription,
        status: "OPEN",
      },
    });

    // إشعار الإدارة فوراً عبر تليجرام
    const alertMsg =
      `🔧 *طلب صيانة / ضمان جديد - MG Group*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🏷️ *كود الضمان:* \`${warranty.warrantyCode}\`\n` +
      `👤 *العميل:* ${warranty.customerName} (${warranty.customerPhone})\n` +
      `📦 *الجهاز:* ${warranty.productName}\n` +
      `🔢 *السيريال:* \`${warranty.serialNumber || "بدون"}\`\n` +
      `⚠️ *وصف العطل:* "${issueDescription}"\n` +
      `📅 *نهاية الضمان:* ${warranty.endDate.toLocaleDateString("ar-EG")}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📍 يرجى المتابعة مع العميل وتحديد الصيانة بالمعرض (13 جسر السويس)`;

    sendAdminDirectAlert(alertMsg).catch((e) =>
      console.error("فشل إرسال إشعار الصيانة لتليجرام:", e.message)
    );

    return ticket;
  }

  /**
   * تحديث بيانات بطاقة الضمان
   */
  static async updateWarranty(
    warrantyId: number,
    data: {
      customerName?: string;
      customerPhone?: string;
      productName?: string;
      serialNumber?: string;
      status?: string;
      warrantyMonths?: number;
    }
  ) {
    const warranty = await prisma.warrantyRecord.findUnique({
      where: { id: warrantyId },
    });

    if (!warranty) throw new Error("بطاقة الضمان غير موجودة");

    let newEndDate = warranty.endDate;
    if (data.warrantyMonths) {
      newEndDate = new Date(warranty.startDate);
      newEndDate.setMonth(newEndDate.getMonth() + Number(data.warrantyMonths));
    }

    return await prisma.warrantyRecord.update({
      where: { id: warrantyId },
      data: {
        ...(data.customerName && { customerName: data.customerName.trim() }),
        ...(data.customerPhone && { customerPhone: data.customerPhone.trim() }),
        ...(data.productName && { productName: data.productName.trim() }),
        ...(data.serialNumber !== undefined && { serialNumber: data.serialNumber ? data.serialNumber.trim() : null }),
        ...(data.status && { status: data.status }),
        ...(data.warrantyMonths && { endDate: newEndDate }),
      },
      include: { tickets: true },
    });
  }

  /**
   * حذف بطاقة الضمان
   */
  static async deleteWarranty(warrantyId: number) {
    return await prisma.warrantyRecord.delete({
      where: { id: warrantyId },
    });
  }

  /**
   * تحديث حالة تذكرة الصيانة (تم الإصلاح أو تم الاستبدال)
   */
  static async updateTicketStatus(
    ticketId: number,
    data: { status: string; actionTaken?: string }
  ) {
    return await prisma.maintenanceTicket.update({
      where: { id: ticketId },
      data: {
        status: data.status,
        ...(data.actionTaken && { actionTaken: data.actionTaken }),
      },
    });
  }
}
