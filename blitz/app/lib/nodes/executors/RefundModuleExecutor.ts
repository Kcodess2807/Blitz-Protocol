import { ExecutionContext } from '../types/execution';

export interface RefundExecutionResult {
  method: 'MODULE_TO_FRONTEND';
  refundResult: {
    orderId: string;
    eligible: boolean;
    refundAmount?: number;
    refundMethod?: string;
    processingTime?: string;
    refundId?: string;
    reason: string;
    message: string;
    returnRequired?: boolean;
    returnAddress?: string;
  };
}

// Order database for refund processing
const ORDER_DATABASE: Record<string, { amount: number; deliveredDate: string; eligible: boolean }> = {
  'ORD-67890': { amount: 1299, deliveredDate: '2024-12-05', eligible: true },
  'ORD-44444': { amount: 2999, deliveredDate: '2024-11-15', eligible: true },
  'ORD-55555': { amount: 899, deliveredDate: '2024-10-01', eligible: false }, // Too old
  'ORD-12345': { amount: 2499, deliveredDate: '2024-12-10', eligible: false }, // Not delivered yet
};

export class RefundModuleExecutor {
  async execute(
    orderId: string,
    reason: string,
    context: ExecutionContext
  ): Promise<RefundExecutionResult> {
    console.log('[RefundModuleExecutor] Processing refund:', { orderId, reason });

    // Extract order ID
    const cleanOrderId = this.extractOrderId(orderId);

    // Get order info from database
    const orderInfo = ORDER_DATABASE[cleanOrderId] || {
      amount: 1999,
      deliveredDate: '2024-12-08',
      eligible: true,
    };

    // Check eligibility (30-day return policy)
    const deliveredDate = new Date(orderInfo.deliveredDate);
    const today = new Date();
    const daysSinceDelivery = Math.floor((today.getTime() - deliveredDate.getTime()) / (1000 * 60 * 60 * 24));
    const isWithinReturnWindow = daysSinceDelivery <= 30;

    if (!orderInfo.eligible || !isWithinReturnWindow) {
      return {
        method: 'MODULE_TO_FRONTEND',
        refundResult: {
          orderId: cleanOrderId,
          eligible: false,
          reason: this.getIneligibilityReason(daysSinceDelivery),
          message: `Sorry, order ${cleanOrderId} is not eligible for refund. ${this.getIneligibilityReason(daysSinceDelivery)}`,
        },
      };
    }

    // Process refund
    const refundId = `REF-${Date.now().toString().slice(-6)}`;

    return {
      method: 'MODULE_TO_FRONTEND',
      refundResult: {
        orderId: cleanOrderId,
        eligible: true,
        refundAmount: orderInfo.amount,
        refundMethod: 'Original Payment Method',
        processingTime: '5-7 business days',
        refundId,
        reason: reason || 'Customer request',
        message: `Refund request ${refundId} has been initiated for order ${cleanOrderId}. Amount of ₹${orderInfo.amount} will be refunded within 5-7 business days.`,
        returnRequired: true,
        returnAddress: 'Karnataka Enterprises, Warehouse 4B, Industrial Area, Bangalore - 560001',
      },
    };
  }

  private extractOrderId(input: string): string {
    const match = input.match(/ORD-\d+/i);
    if (match) {
      return match[0].toUpperCase();
    }
    return 'ORD-67890';
  }

  private getIneligibilityReason(daysSinceDelivery: number): string {
    if (daysSinceDelivery > 30) {
      return 'Return window of 30 days has expired.';
    }
    if (daysSinceDelivery < 0) {
      return 'Order has not been delivered yet.';
    }
    return 'Order does not meet refund criteria.';
  }
}
