import { ExecutionContext } from '../types/execution';

export interface ServiceEnquiryExecutionResult {
  method: 'MODULE_TO_FRONTEND';
  enquiryResult: {
    success: boolean;
    ticketNumber: string;
    department: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    responseTime: string;
    message: string;
    contactEmail: string;
    contactPhone: string;
  };
}

export class ServiceEnquiryModuleExecutor {
  async execute(
    enquiryType: string,
    description: string,
    context: ExecutionContext
  ): Promise<ServiceEnquiryExecutionResult> {
    console.log('[ServiceEnquiryModuleExecutor] Processing enquiry:', { enquiryType, description });

    // Generate ticket number
    const ticketNumber = `TKT-${Date.now().toString().slice(-8)}`;

    // Route to appropriate department based on enquiry type
    const routing = this.routeEnquiry(enquiryType, description);

    console.log('[ServiceEnquiryModuleExecutor] Enquiry routed:', {
      ticketNumber,
      department: routing.department,
      priority: routing.priority,
    });

    return {
      method: 'MODULE_TO_FRONTEND',
      enquiryResult: {
        success: true,
        ticketNumber,
        department: routing.department,
        priority: routing.priority,
        responseTime: routing.responseTime,
        message: `Your service enquiry has been registered successfully. Ticket number: ${ticketNumber}. Our ${routing.department} team will contact you within ${routing.responseTime}.`,
        contactEmail: routing.contactEmail,
        contactPhone: routing.contactPhone,
      },
    };
  }

  private routeEnquiry(enquiryType: string, description: string): {
    department: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    responseTime: string;
    contactEmail: string;
    contactPhone: string;
  } {
    const lowerEnquiry = (enquiryType + ' ' + description).toLowerCase();

    // Product Support / Technical Issues
    if (
      lowerEnquiry.includes('product') ||
      lowerEnquiry.includes('technical') ||
      lowerEnquiry.includes('defect') ||
      lowerEnquiry.includes('broken') ||
      lowerEnquiry.includes('damaged') ||
      lowerEnquiry.includes('not working') ||
      lowerEnquiry.includes('quality')
    ) {
      return {
        department: 'Product Support',
        priority: 'high',
        responseTime: '4-6 hours',
        contactEmail: 'support@karnatakaenterprises.com',
        contactPhone: '+91-80-1234-5678',
      };
    }

    // Warranty Claims
    if (
      lowerEnquiry.includes('warranty') ||
      lowerEnquiry.includes('guarantee') ||
      lowerEnquiry.includes('replacement')
    ) {
      return {
        department: 'Warranty Services',
        priority: 'medium',
        responseTime: '12-24 hours',
        contactEmail: 'warranty@karnatakaenterprises.com',
        contactPhone: '+91-80-1234-5679',
      };
    }

    // Billing / Payment Issues
    if (
      lowerEnquiry.includes('bill') ||
      lowerEnquiry.includes('payment') ||
      lowerEnquiry.includes('invoice') ||
      lowerEnquiry.includes('refund') ||
      lowerEnquiry.includes('charge')
    ) {
      return {
        department: 'Billing & Accounts',
        priority: 'high',
        responseTime: '6-8 hours',
        contactEmail: 'billing@karnatakaenterprises.com',
        contactPhone: '+91-80-1234-5680',
      };
    }

    // Complaints / Escalations
    if (
      lowerEnquiry.includes('complaint') ||
      lowerEnquiry.includes('escalate') ||
      lowerEnquiry.includes('manager') ||
      lowerEnquiry.includes('dissatisfied') ||
      lowerEnquiry.includes('unhappy')
    ) {
      return {
        department: 'Customer Relations',
        priority: 'urgent',
        responseTime: '2-4 hours',
        contactEmail: 'escalations@karnatakaenterprises.com',
        contactPhone: '+91-80-1234-5681',
      };
    }

    // Bulk Orders / Business Enquiries
    if (
      lowerEnquiry.includes('bulk') ||
      lowerEnquiry.includes('wholesale') ||
      lowerEnquiry.includes('business') ||
      lowerEnquiry.includes('quote') ||
      lowerEnquiry.includes('quotation')
    ) {
      return {
        department: 'Sales & Business Development',
        priority: 'medium',
        responseTime: '24 hours',
        contactEmail: 'sales@karnatakaenterprises.com',
        contactPhone: '+91-80-1234-5682',
      };
    }

    // Default: General Customer Service
    return {
      department: 'Customer Service',
      priority: 'low',
      responseTime: '24-48 hours',
      contactEmail: 'customercare@karnatakaenterprises.com',
      contactPhone: '+91-80-1234-5677',
    };
  }
}
