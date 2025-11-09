import { ExecutionContext } from '../types/execution';
import { getOrderById } from '@/app/lib/mock-data/orders';

export interface CancellationExecutionResult {
  method: 'MODULE_TO_FRONTEND';
  cancellationResult: {
    success: boolean;
    message: string;
    orderId: string;
    refundAmount?: number;
    refundMethod?: string;
    refundTimeline?: string;
    reason?: string;
  };
}

export class CancellationModuleExecutor {
  async execute(
    orderId: string,
    reason: string,
    context: ExecutionContext
  ): Promise<CancellationExecutionResult> {
    console.log('[CancellationModuleExecutor] Processing cancellation:', { orderId, reason });

    // Extract order ID
    const cleanOrderId = this.extractOrderId(orderId);

    // Get order from database
    const order = getOrderById(cleanOrderId);

    if (!order) {
      return {
        method: 'MODULE_TO_FRONTEND',
        cancellationResult: {
          success: false,
          message: `Order ${cleanOrderId} not found in our system. Please verify the order ID.`,
          orderId: cleanOrderId,
        },
      };
    }

    // Business Rule 1: Check if order is already cancelled or delivered
    if (order.status === 'cancelled') {
      return {
        method: 'MODULE_TO_FRONTEND',
        cancellationResult: {
          success: false,
          message: `Order ${cleanOrderId} is already cancelled. No further action needed.`,
          orderId: cleanOrderId,
        },
      };
    }

    if (order.status === 'delivered') {
      return {
        method: 'MODULE_TO_FRONTEND',
        cancellationResult: {
          success: false,
          message: `Order ${cleanOrderId} has already been delivered. Please initiate a return request instead of cancellation.`,
          orderId: cleanOrderId,
        },
      };
    }

    // Business Rule 2: Cannot cancel if in transit or shipped
    if (order.status === 'in_transit' || order.status === 'shipped') {
      return {
        method: 'MODULE_TO_FRONTEND',
        cancellationResult: {
          success: false,
          message: `Order ${cleanOrderId} is currently ${order.status.replace('_', ' ')} and cannot be cancelled. The shipment is already on its way. You may refuse delivery or initiate a return after receiving the product.`,
          orderId: cleanOrderId,
        },
      };
    }

    // Business Rule 3: Check if order is older than 7 days
    const orderDate = new Date(order.orderDate);
    const today = new Date();
    const daysDifference = Math.floor((today.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDifference > 7) {
      return {
        method: 'MODULE_TO_FRONTEND',
        cancellationResult: {
          success: false,
          message: `Order ${cleanOrderId} was placed more than 7 days ago (${daysDifference} days) and cannot be cancelled. Please contact customer support for assistance.`,
          orderId: cleanOrderId,
        },
      };
    }

    // Business Rule 4: Can only cancel pending or processing orders
    if (order.status === 'pending' || order.status === 'processing') {
      console.log('[CancellationModuleExecutor] Cancellation approved:', cleanOrderId);
      
      return {
        method: 'MODULE_TO_FRONTEND',
        cancellationResult: {
          success: true,
          message: `Order ${cleanOrderId} has been successfully cancelled. Your refund of ₹${order.price.toLocaleString('en-IN')} will be processed within 5-7 business days.`,
          orderId: cleanOrderId,
          refundAmount: order.price,
          refundMethod: 'Original payment method',
          refundTimeline: '5-7 business days',
          reason: reason || 'Customer request',
        },
      };
    }

    // Fallback
    return {
      method: 'MODULE_TO_FRONTEND',
      cancellationResult: {
        success: false,
        message: `Order ${cleanOrderId} cannot be cancelled at this time. Current status: ${order.status}. Please contact customer support.`,
        orderId: cleanOrderId,
      },
    };
  }

  private extractOrderId(input: string): string {
    const match = input.match(/ORD-\d+/i);
    if (match) {
      return match[0].toUpperCase();
    }
    return input.toUpperCase();
  }
}
