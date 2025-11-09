import { ExecutionContext } from '../types/execution';
import { getOrderById } from '@/app/lib/mock-data/orders';

export interface TrackingExecutionResult {
  method: 'MODULE_TO_FRONTEND';
  trackingInfo: {
    orderId: string;
    status: string;
    currentLocation: string;
    estimatedDelivery: string;
    trackingNumber: string;
    carrier: string;
    customerName: string;
    productName: string;
    milestones: Array<{
      date: string;
      time: string;
      status: string;
      location: string;
    }>;
  } | null;
  error?: string;
}

export class TrackingModuleExecutor {
  async execute(
    orderId: string,
    context: ExecutionContext
  ): Promise<TrackingExecutionResult> {
    console.log('[TrackingModuleExecutor] Tracking order:', orderId);

    // Extract order ID from various formats
    const cleanOrderId = this.extractOrderId(orderId);

    // Get order from mock database
    const order = getOrderById(cleanOrderId);

    if (!order) {
      console.log('[TrackingModuleExecutor] Order not found:', cleanOrderId);
      return {
        method: 'MODULE_TO_FRONTEND',
        trackingInfo: null,
        error: `Order ${cleanOrderId} not found in our system. Please check the order ID and try again.`,
      };
    }

    const trackingInfo = {
      orderId: order.orderId,
      status: order.status.replace('_', ' ').toUpperCase(),
      currentLocation: order.currentLocation || order.milestones[order.milestones.length - 1].location,
      estimatedDelivery: order.estimatedDelivery,
      trackingNumber: order.trackingNumber,
      carrier: order.carrier,
      customerName: order.customerName,
      productName: order.productName,
      milestones: order.milestones,
    };

    console.log('[TrackingModuleExecutor] Tracking result:', {
      orderId: trackingInfo.orderId,
      status: trackingInfo.status,
      milestonesCount: trackingInfo.milestones.length,
    });

    return {
      method: 'MODULE_TO_FRONTEND',
      trackingInfo,
    };
  }

  private extractOrderId(input: string): string {
    // Try to extract order ID from various formats
    const match = input.match(/ORD-\d+/i);
    if (match) {
      return match[0].toUpperCase();
    }
    
    // Return as-is if no match
    return input.toUpperCase();
  }
}
