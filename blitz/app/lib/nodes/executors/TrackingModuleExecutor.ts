import { ExecutionContext } from '../types/execution';

export interface TrackingExecutionResult {
  method: 'MODULE_TO_FRONTEND';
  trackingInfo: {
    orderId: string;
    status: string;
    currentLocation: string;
    estimatedDelivery: string;
    trackingNumber: string;
    carrier: string;
    milestones: Array<{
      date: string;
      status: string;
      location: string;
    }>;
  };
}

// Order tracking database
const ORDER_TRACKING_DB: Record<string, TrackingExecutionResult['trackingInfo']> = {
  'ORD-12345': {
    orderId: 'ORD-12345',
    status: 'In Transit',
    currentLocation: 'Mumbai Distribution Center',
    estimatedDelivery: 'Dec 12, 2024',
    trackingNumber: 'TRK-98765-IN',
    carrier: 'BlueDart Express',
    milestones: [
      { date: 'Dec 8, 2024 10:30 AM', status: 'Order Placed', location: 'Bangalore' },
      { date: 'Dec 8, 2024 3:45 PM', status: 'Picked Up', location: 'Bangalore Warehouse' },
      { date: 'Dec 9, 2024 8:20 AM', status: 'In Transit', location: 'Bangalore Hub' },
      { date: 'Dec 10, 2024 2:15 PM', status: 'Arrived at Hub', location: 'Mumbai Distribution Center' },
    ],
  },
  'ORD-67890': {
    orderId: 'ORD-67890',
    status: 'Delivered',
    currentLocation: 'Delivered to Customer',
    estimatedDelivery: 'Dec 5, 2024',
    trackingNumber: 'TRK-45678-IN',
    carrier: 'DTDC Courier',
    milestones: [
      { date: 'Dec 3, 2024 9:00 AM', status: 'Order Placed', location: 'Delhi' },
      { date: 'Dec 3, 2024 2:30 PM', status: 'Picked Up', location: 'Delhi Warehouse' },
      { date: 'Dec 4, 2024 11:45 AM', status: 'In Transit', location: 'Delhi Hub' },
      { date: 'Dec 5, 2024 10:30 AM', status: 'Out for Delivery', location: 'Gurgaon' },
      { date: 'Dec 5, 2024 4:15 PM', status: 'Delivered', location: 'Customer Address' },
    ],
  },
  'ORD-11111': {
    orderId: 'ORD-11111',
    status: 'Processing',
    currentLocation: 'Warehouse - Preparing for Shipment',
    estimatedDelivery: 'Dec 15, 2024',
    trackingNumber: 'TRK-11111-IN',
    carrier: 'Delhivery',
    milestones: [
      { date: 'Dec 10, 2024 11:20 AM', status: 'Order Placed', location: 'Chennai' },
      { date: 'Dec 10, 2024 3:00 PM', status: 'Payment Confirmed', location: 'Chennai' },
      { date: 'Dec 11, 2024 9:30 AM', status: 'Processing', location: 'Chennai Warehouse' },
    ],
  },
};

export class TrackingModuleExecutor {
  async execute(
    orderId: string,
    context: ExecutionContext
  ): Promise<TrackingExecutionResult> {
    console.log('[TrackingModuleExecutor] Tracking order:', orderId);

    // Extract order ID from various formats
    const cleanOrderId = this.extractOrderId(orderId);

    // Get tracking info from database
    const trackingInfo = ORDER_TRACKING_DB[cleanOrderId] || this.generateRandomTracking(cleanOrderId);

    console.log('[TrackingModuleExecutor] Tracking result:', {
      orderId: trackingInfo.orderId,
      status: trackingInfo.status,
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
    
    // Default order for testing
    return 'ORD-12345';
  }

  private generateRandomTracking(orderId: string): TrackingExecutionResult['trackingInfo'] {
    const statuses = ['Processing', 'In Transit', 'Out for Delivery'];
    const carriers = ['BlueDart Express', 'DTDC Courier', 'Delhivery', 'India Post'];
    const locations = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad'];
    
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    const randomCarrier = carriers[Math.floor(Math.random() * carriers.length)];
    const randomLocation = locations[Math.floor(Math.random() * locations.length)];
    
    const today = new Date();
    const deliveryDate = new Date(today);
    deliveryDate.setDate(deliveryDate.getDate() + 3);

    return {
      orderId,
      status: randomStatus,
      currentLocation: `${randomLocation} Distribution Center`,
      estimatedDelivery: deliveryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      trackingNumber: `TRK-${Math.floor(Math.random() * 90000) + 10000}-IN`,
      carrier: randomCarrier,
      milestones: [
        {
          date: today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' 10:00 AM',
          status: 'Order Placed',
          location: randomLocation,
        },
        {
          date: today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' 2:30 PM',
          status: randomStatus,
          location: `${randomLocation} Hub`,
        },
      ],
    };
  }
}
