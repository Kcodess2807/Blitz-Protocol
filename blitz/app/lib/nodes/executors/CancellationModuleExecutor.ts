import { ExecutionContext } from '../types/execution';

export interface CancellationExecutionResult {
  method: 'MODULE_TO_FRONTEND';
  cancellationResult: {
    orderId: string;
    canCancel: boolean;
    reason: string;
    refundAmount?: number;
    refundMethod?: string;
    processingTime?: string;
    cancellationId?: string;
    message: string;
  };
}

// Order status database
const ORDER_STATUS_DB: Record<string, { status: string; amount: number; canCancel: boolean }> = {
  'ORD-12345': { status: 'In Transit', amount: 2499, canCancel: false },
  'ORD-67890': { status: 'Delivered', amount: 1299, canCancel: false },
  'ORD-11111': { status: 'Processing', amount: 3999, canCancel: true },
  'ORD-22222': { status: 'Payment Pending', amount: 899, canCancel: true },
  'ORD-33333': { status: 'Confirmed', amount: 5499, canCancel: true },
};

export class CancellationModuleExecutor {
  async execute(
    orderId: string,
    reason: string,
    context: ExecutionContext
  ): Promise<CancellationExecutionResult> {
    console.log('[CancellationModuleExecutor] Processing cancellation:', { orderId, reason });

    // Extract order ID
    const cleanOrderId = this.extractOrderId(orderId);

    // Get order status from database
    const orderInfo = ORDER_STATUS_DB[cleanOrderId] || {
      status: 'Processing',
      amount: 1999,
      canCancel: true,
    };

    // Check if cancellation is allowed
    if (!orderInfo.canCancel) {
      return {
        method: 'MODULE_TO_FRONTEND',
        cancellationResult: {
          orderId: cleanOrderId,
          canCancel: false,
          reason: this.getCancellationDenialReason(orderInfo.status),
          message: `Sorry, order ${cleanOrderId} cannot be cancelled as it is already ${orderInfo.status.toLowerCase()}.`,
        },
      };
    }

    // Process cancellation
    const cancellationId = `CAN-${Date.now().toString().slice(-6)}`;

    return {
      method: 'MODULE_TO_FRONTEND',
      cancellationResult: {
        orderId: cleanOrderId,
        canCancel: true,
        reason: reason || 'Customer request',
        refundAmount: orderInfo.amount,
        refundMethod: 'Original Payment Method',
        processingTime: '3-5 business days',
        cancellationId,
        message: `Order ${cleanOrderId} has been successfully cancelled. Refund of ₹${orderInfo.amount} will be processed within 3-5 business days.`,
      },
    };
  }

  private extractOrderId(input: string): string {
    const match = input.match(/ORD-\d+/i);
    if (match) {
      return match[0].toUpperCase();
    }
    return 'ORD-11111';
  }

  private getCancellationDenialReason(status: string): string {
    const reasons: Record<string, string> = {
      'In Transit': 'Order is already shipped and in transit',
      'Delivered': 'Order has already been delivered',
      'Out for Delivery': 'Order is out for delivery',
      'Shipped': 'Order has already been shipped',
    };
    return reasons[status] || 'Order cannot be cancelled at this stage';
  }
}
